alter table public.profiles
  add column if not exists show_qa_llel_data boolean not null default false;

update public.profiles
set show_qa_llel_data = true
where user_kind = 'automation'
  and show_qa_llel_data = false;
