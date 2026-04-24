# 🎓 Guia do Sistema de Mentoria - HBC Estudos

Este documento descreve o fluxo de trabalho e as funcionalidades disponíveis para usuários com papel de **Mentor**.

---

## 1. Configuração Inicial (Admin)
O papel de Mentor não pode ser ativado pelo usuário. Ele deve ser atribuído por um administrador através do banco de dados (Supabase).
- O administrador executa o script `admin_commands.sql` para promover um e-mail específico.
- Uma vez promovido, o menu lateral do usuário ganhará as abas: **Painel Mentor** e **Análise Global**.

## 2. Vinculando Alunos
Para monitorar um aluno, o mentor precisa do **ID de Usuário** do mesmo.
1. O aluno deve ir em **Ajustes** e copiar o código em "Seu ID de Usuário".
2. O Mentor acessa o **Painel Mentor** e clica em **Vincular Aluno**.
3. Cola o ID e confirma. Agora o aluno aparece na sua lista de gestão.

## 3. Gestão de Alunos (Modo de Intervenção)
Ao clicar em **Gerenciar Aluno** no card do estudante, o Mentor entra no "Modo de Gerenciamento" (identificado por um banner roxo).
Neste modo:
- **Configurar Edital**: O Mentor define as disciplinas e tópicos do concurso alvo do aluno. O Mentor não vê as métricas de estudo (para manter o foco no planejamento).
- **Planejar Ciclo**: O Mentor monta a grade horária e a ordem das matérias para o aluno. Ao salvar, o ciclo é enviado diretamente para a conta do aluno.
- **Segurança**: Todas as alterações feitas neste modo são salvas na nuvem do aluno, não afetando os dados locais do mentor.

## 4. Monitoramento e Análise Global
A aba **Análise Global** oferece uma visão estratégica de toda a turma:
- **Destaques de Elite**: Alunos com mais de 80% de acerto ou alta carga horária.
- **Atenção Requerida**: Alunos com baixo rendimento ou que não estão registrando dados.
- **Estatísticas Consolidadas**: Total de questões, ciclos e horas de toda a mentoria.

## 5. Sincronização em Tempo Real
O sistema utiliza os canais de real-time do Supabase. Quando um aluno salva um progresso ou termina um timer, os dados no dashboard do mentor são atualizados automaticamente na próxima consulta ou recarregamento, permitindo um acompanhamento próximo.

---
*HBC Estudos - Premium Mentorship Module*
