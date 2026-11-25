-- Route-specific FCL quotation records preserve the Haitian requested pickup region.
insert into public.konsoliss_booking_routes(code,country,region,shipping_mode,delivery,requests_enabled,service_verified,checkout_enabled,price_published)
values
('HT-PAP-FCL-PICKUP','HT','PAP','FCL','pickup',true,false,false,false),
('HT-CAP-FCL-PICKUP','HT','CAP','FCL','pickup',true,false,false,false),
('HT-CAY-FCL-PICKUP','HT','CAY','FCL','pickup',true,false,false,false)
on conflict(code) do nothing;
