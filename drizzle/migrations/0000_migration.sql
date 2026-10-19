-- Settings / profile per owner
CREATE TABLE public.store_settings (
  owner_id uuid PRIMARY KEY,
  store_name text NOT NULL DEFAULT 'MyPhone Shop',
  min_stock_default integer NOT NULL DEFAULT 3 CHECK (min_stock_default >= 0),
  show_lbp boolean NOT NULL DEFAULT false,
  lbp_rate numeric(14,2) NOT NULL DEFAULT 89500 CHECK (lbp_rate > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.store_settings FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own categories" ON public.categories FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  phone text,
  notes text,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own suppliers" ON public.suppliers FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 150),
  brand text,
  model text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  sku text,
  barcode text,
  imei text,
  purchase_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  sale_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_stock integer NOT NULL DEFAULT 3 CHECK (min_stock >= 0),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  location text,
  notes text,
  image_url text,
  is_sample boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX products_owner_sku_uniq ON public.products(owner_id, lower(sku)) WHERE sku IS NOT NULL AND sku <> '';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own products" ON public.products FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  sold_at timestamptz NOT NULL DEFAULT now(),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total numeric(12,2) NOT NULL DEFAULT 0,
  total_cost numeric(12,2) NOT NULL DEFAULT 0,
  note text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','returned')),
  returned_at timestamptz,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sales read" ON public.sales FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.sale_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost numeric(12,2) NOT NULL CHECK (unit_cost >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sale_lines TO authenticated;
GRANT ALL ON public.sale_lines TO service_role;
ALTER TABLE public.sale_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lines read" ON public.sale_lines FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('initial','sale','restock','return','adjustment')),
  quantity_change integer NOT NULL,
  quantity_after integer NOT NULL,
  unit_cost numeric(12,2),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own movements read" ON public.inventory_movements FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE INDEX ON public.inventory_movements(owner_id, occurred_at DESC);
CREATE INDEX ON public.sales(owner_id, sold_at DESC);

-- updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER settings_touch BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Log movements when products are created or quantity edited directly
CREATE OR REPLACE FUNCTION public.log_product_qty() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('myphone.skip_log', true) = 'on' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.quantity > 0 THEN
      INSERT INTO inventory_movements(owner_id, product_id, product_name, type, quantity_change, quantity_after, unit_cost, is_sample, note)
      VALUES (NEW.owner_id, NEW.id, NEW.name, 'initial', NEW.quantity, NEW.quantity, NEW.purchase_price, NEW.is_sample, 'Opening stock');
    END IF;
  ELSIF NEW.quantity <> OLD.quantity THEN
    INSERT INTO inventory_movements(owner_id, product_id, product_name, type, quantity_change, quantity_after, is_sample, note)
    VALUES (NEW.owner_id, NEW.id, NEW.name, 'adjustment', NEW.quantity - OLD.quantity, NEW.quantity, NEW.is_sample, 'Manual edit');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER products_log AFTER INSERT OR UPDATE OF quantity ON public.products FOR EACH ROW EXECUTE FUNCTION public.log_product_qty();

-- New user bootstrap
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; i int := 0;
BEGIN
  INSERT INTO store_settings(owner_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  FOREACH c IN ARRAY ARRAY['Phones','Headsets','Chargers','Cables','Cases','Screen Protectors','Power Banks','Other'] LOOP
    INSERT INTO categories(owner_id, name, sort_order) VALUES (NEW.id, c, i) ON CONFLICT DO NOTHING;
    i := i + 1;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Record sale atomically. p_lines: [{product_id, quantity, unit_price}]
CREATE OR REPLACE FUNCTION public.record_sale(p_lines jsonb, p_discount numeric DEFAULT 0, p_note text DEFAULT NULL, p_sold_at timestamptz DEFAULT now())
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid(); v_sale uuid; l jsonb; p products%ROWTYPE;
  v_qty int; v_price numeric; v_sub numeric := 0; v_cost numeric := 0; v_sample boolean := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN RAISE EXCEPTION 'Add at least one product'; END IF;
  IF coalesce(p_discount,0) < 0 THEN RAISE EXCEPTION 'Discount cannot be negative'; END IF;
  INSERT INTO sales(owner_id, sold_at, discount, note) VALUES (uid, coalesce(p_sold_at, now()), coalesce(p_discount,0), nullif(trim(p_note),'')) RETURNING id INTO v_sale;
  PERFORM set_config('myphone.skip_log','on', true);
  FOR l IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_qty := (l->>'quantity')::int;
    v_price := (l->>'unit_price')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Quantity must be at least 1'; END IF;
    IF v_price IS NULL OR v_price < 0 THEN RAISE EXCEPTION 'Price cannot be negative'; END IF;
    SELECT * INTO p FROM products WHERE id = (l->>'product_id')::uuid AND owner_id = uid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
    IF p.quantity < v_qty THEN RAISE EXCEPTION 'Not enough stock for "%": % left', p.name, p.quantity; END IF;
    UPDATE products SET quantity = quantity - v_qty WHERE id = p.id;
    INSERT INTO sale_lines(owner_id, sale_id, product_id, product_name, quantity, unit_price, unit_cost)
      VALUES (uid, v_sale, p.id, p.name, v_qty, v_price, p.purchase_price);
    INSERT INTO inventory_movements(owner_id, product_id, product_name, type, quantity_change, quantity_after, unit_cost, sale_id, occurred_at, is_sample)
      VALUES (uid, p.id, p.name, 'sale', -v_qty, p.quantity - v_qty, p.purchase_price, v_sale, coalesce(p_sold_at, now()), p.is_sample);
    v_sub := v_sub + v_qty * v_price; v_cost := v_cost + v_qty * p.purchase_price;
    v_sample := v_sample OR p.is_sample;
  END LOOP;
  PERFORM set_config('myphone.skip_log','off', true);
  IF coalesce(p_discount,0) > v_sub THEN RAISE EXCEPTION 'Discount is larger than the sale'; END IF;
  UPDATE sales SET subtotal = v_sub, total = v_sub - coalesce(p_discount,0), total_cost = v_cost, is_sample = v_sample WHERE id = v_sale;
  RETURN v_sale;
END $$;

CREATE OR REPLACE FUNCTION public.return_sale(p_sale_id uuid, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); s sales%ROWTYPE; l sale_lines%ROWTYPE; v_after int;
BEGIN
  SELECT * INTO s FROM sales WHERE id = p_sale_id AND owner_id = uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF s.status = 'returned' THEN RAISE EXCEPTION 'Sale already returned'; END IF;
  PERFORM set_config('myphone.skip_log','on', true);
  FOR l IN SELECT * FROM sale_lines WHERE sale_id = s.id LOOP
    IF l.product_id IS NOT NULL THEN
      UPDATE products SET quantity = quantity + l.quantity WHERE id = l.product_id AND owner_id = uid RETURNING quantity INTO v_after;
      IF v_after IS NOT NULL THEN
        INSERT INTO inventory_movements(owner_id, product_id, product_name, type, quantity_change, quantity_after, unit_cost, sale_id, note, is_sample)
        VALUES (uid, l.product_id, l.product_name, 'return', l.quantity, v_after, l.unit_cost, s.id, nullif(trim(p_note),''), s.is_sample);
      END IF;
    END IF;
  END LOOP;
  PERFORM set_config('myphone.skip_log','off', true);
  UPDATE sales SET status = 'returned', returned_at = now(), note = coalesce(note,'') || CASE WHEN p_note IS NOT NULL AND p_note <> '' THEN ' [Return: ' || p_note || ']' ELSE '' END WHERE id = s.id;
END $$;

CREATE OR REPLACE FUNCTION public.restock_product(p_product_id uuid, p_quantity int, p_unit_cost numeric, p_supplier_id uuid DEFAULT NULL, p_date timestamptz DEFAULT now(), p_update_cost boolean DEFAULT true, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p products%ROWTYPE;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be at least 1'; END IF;
  IF p_unit_cost IS NULL OR p_unit_cost < 0 THEN RAISE EXCEPTION 'Cost cannot be negative'; END IF;
  SELECT * INTO p FROM products WHERE id = p_product_id AND owner_id = uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF p_supplier_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM suppliers WHERE id = p_supplier_id AND owner_id = uid) THEN RAISE EXCEPTION 'Supplier not found'; END IF;
  PERFORM set_config('myphone.skip_log','on', true);
  UPDATE products SET quantity = quantity + p_quantity,
    purchase_price = CASE WHEN p_update_cost THEN p_unit_cost ELSE purchase_price END,
    supplier_id = coalesce(p_supplier_id, supplier_id)
  WHERE id = p.id;
  PERFORM set_config('myphone.skip_log','off', true);
  INSERT INTO inventory_movements(owner_id, product_id, product_name, type, quantity_change, quantity_after, unit_cost, supplier_id, occurred_at, note, is_sample)
  VALUES (uid, p.id, p.name, 'restock', p_quantity, p.quantity + p_quantity, p_unit_cost, p_supplier_id, coalesce(p_date, now()), nullif(trim(p_note),''), p.is_sample);
END $$;

CREATE OR REPLACE FUNCTION public.clear_sample_data() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  DELETE FROM inventory_movements WHERE owner_id = uid AND is_sample;
  DELETE FROM sales WHERE owner_id = uid AND is_sample;
  DELETE FROM products WHERE owner_id = uid AND is_sample;
  DELETE FROM suppliers WHERE owner_id = uid AND is_sample;
END $$;

CREATE OR REPLACE FUNCTION public.load_sample_data() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); s1 uuid; s2 uuid; pid uuid;
  cat_ph uuid; cat_hs uuid; cat_ch uuid; cat_cb uuid; cat_cs uuid; cat_sp uuid; cat_pb uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM products WHERE owner_id = uid AND is_sample) THEN RAISE EXCEPTION 'Sample data is already loaded'; END IF;
  PERFORM public.handle_new_user_cats(uid);
  SELECT id INTO cat_ph FROM categories WHERE owner_id=uid AND name='Phones';
  SELECT id INTO cat_hs FROM categories WHERE owner_id=uid AND name='Headsets';
  SELECT id INTO cat_ch FROM categories WHERE owner_id=uid AND name='Chargers';
  SELECT id INTO cat_cb FROM categories WHERE owner_id=uid AND name='Cables';
  SELECT id INTO cat_cs FROM categories WHERE owner_id=uid AND name='Cases';
  SELECT id INTO cat_sp FROM categories WHERE owner_id=uid AND name='Screen Protectors';
  SELECT id INTO cat_pb FROM categories WHERE owner_id=uid AND name='Power Banks';
  INSERT INTO suppliers(owner_id,name,phone,is_sample) VALUES (uid,'[Sample] Beirut Mobile Wholesale','01 000 000',true) RETURNING id INTO s1;
  INSERT INTO suppliers(owner_id,name,is_sample) VALUES (uid,'[Sample] Accessories Hub',true) RETURNING id INTO s2;
  INSERT INTO products(owner_id,name,brand,model,category_id,sku,purchase_price,sale_price,quantity,min_stock,supplier_id,location,is_sample,imei) VALUES
   (uid,'[Sample] Galaxy A15 128GB','Samsung','A15',cat_ph,'SMP-A15',140,179,4,2,s1,'Shelf A',true,NULL),
   (uid,'[Sample] Redmi Note 13','Xiaomi','Note 13',cat_ph,'SMP-RN13',165,215,1,2,s1,'Shelf A',true,NULL),
   (uid,'[Sample] AirPods-style Earbuds','Generic','TWS-5',cat_hs,'SMP-TWS5',6,15,12,5,s2,'Drawer 2',true,NULL),
   (uid,'[Sample] 20W USB-C Charger','Anker','PowerPort',cat_ch,'SMP-CH20',7,14,0,4,s2,'Drawer 1',true,NULL),
   (uid,'[Sample] USB-C to Lightning Cable 1m','Baseus','CL1',cat_cb,'SMP-CBL1',1.5,5,25,10,s2,'Drawer 1',true,NULL),
   (uid,'[Sample] iPhone 15 Silicone Case','Generic','IP15',cat_cs,'SMP-CS15',1.2,6,3,5,s2,'Wall',true,NULL),
   (uid,'[Sample] Tempered Glass iPhone 14/15','Generic','TG',cat_sp,'SMP-TG15',0.4,3,40,15,s2,'Drawer 3',true,NULL),
   (uid,'[Sample] 10000mAh Power Bank','Xiaomi','PB10',cat_pb,'SMP-PB10',9,18,6,3,s1,'Shelf B',true,NULL);
  UPDATE inventory_movements SET is_sample = true WHERE owner_id = uid AND product_name LIKE '[Sample]%';
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user_cats(p_uid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; i int := 0;
BEGIN
  IF p_uid <> auth.uid() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO store_settings(owner_id) VALUES (p_uid) ON CONFLICT DO NOTHING;
  FOREACH c IN ARRAY ARRAY['Phones','Headsets','Chargers','Cables','Cases','Screen Protectors','Power Banks','Other'] LOOP
    INSERT INTO categories(owner_id, name, sort_order) VALUES (p_uid, c, i) ON CONFLICT DO NOTHING; i := i + 1;
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.record_sale(jsonb,numeric,text,timestamptz), public.return_sale(uuid,text), public.restock_product(uuid,int,numeric,uuid,timestamptz,boolean,text), public.clear_sample_data(), public.load_sample_data(), public.handle_new_user_cats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_sale(jsonb,numeric,text,timestamptz), public.return_sale(uuid,text), public.restock_product(uuid,int,numeric,uuid,timestamptz,boolean,text), public.clear_sample_data(), public.load_sample_data(), public.handle_new_user_cats(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user(), public.log_product_qty() FROM PUBLIC, anon, authenticated;