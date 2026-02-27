-- Property search scale hardening for chat/listings advanced filters + text matching

create extension if not exists pg_trgm;

create index if not exists idx_properties_surface_m2 on properties(surface_m2);
create index if not exists idx_properties_terrain_m2 on properties(terrain_m2);
create index if not exists idx_properties_bedrooms on properties(bedrooms);
create index if not exists idx_properties_bathrooms on properties(bathrooms);
create index if not exists idx_properties_garage_count on properties(garage_count);

create index if not exists idx_properties_status_transaction_city
  on properties(status, transaction_type, city_id);

create index if not exists idx_properties_status_transaction_price
  on properties(status, transaction_type, price_amount);

create index if not exists idx_properties_title_trgm
  on properties using gin (title gin_trgm_ops);

create index if not exists idx_properties_description_trgm
  on properties using gin (description gin_trgm_ops);

create index if not exists idx_property_features_feature_key_trgm
  on property_features using gin (feature_key gin_trgm_ops);

create index if not exists idx_property_features_label_fr_trgm
  on property_features using gin (label_fr gin_trgm_ops);
