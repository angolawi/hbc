-- =========================================================
-- COMANDOS DE ADMINISTRAÇÃO - HBC ESTUDOS
-- Use este script no SQL Editor do Supabase para gerenciar papéis.
-- =========================================================

-- 1. PRÉ-AUTORIZAR UM MENTOR (Antes dele criar a conta)
-- Adicione o e-mail aqui para que ele já nasça como Mentor no sistema.
insert into public.mentor_whitelist (email) 
values ('mentor@novo.com');


-- 2. PROMOVER UM USUÁRIO JÁ EXISTENTE A MENTOR
update public.profiles 
set role = 'mentor' 
where email = 'exemplo@email.com';


-- 3. LISTAR E-MAILS PRÉ-AUTORIZADOS (Ainda não cadastrados ou já mentor)
select * from public.mentor_whitelist;


-- 3. LISTAR TODOS OS MENTORES ATUAIS
select email, role, id 
from public.profiles 
where role = 'mentor';


-- 4. VERIFICAR QUANTOS ALUNOS CADA MENTOR POSSUI
select 
  p.email as mentor_email, 
  count(m.student_id) as total_alunos
from public.profiles p
left join mentorships m on p.id = m.mentor_id
where p.role = 'mentor'
group by p.email;


-- 5. LIMPAR VÍNCULO DE UM ALUNO ESPECÍFICO (Se necessário)
-- delete from mentorships where student_id = 'UUID-DO-ALUNO';
