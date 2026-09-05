alter table if exists lucid_app_submissions
    add column if not exists storage_provider text not null default 'b2',
    add column if not exists package_key text,
    add column if not exists package_size bigint;

create index if not exists lucid_app_submissions_package_key_idx
    on lucid_app_submissions(package_key);
