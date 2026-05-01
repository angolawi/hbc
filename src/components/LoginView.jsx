import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Brain, Lock, Mail, Loader2, Rocket, ArrowRight } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function LoginView() {
  const { login, signUp } = useAuth();
  const { alert } = useNotification();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Preencha todos os campos.', 'error');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await login(email, password);
        if (error) throw error;
      } else {
        // 1. Check for invitation
        const { data: inv, error: invErr } = await supabase
          .from('invitations')
          .select('*')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle();

        if (invErr || !inv) {
          throw new Error('Acesso restrito: Você precisa de um convite vinculado a este e-mail para criar uma conta.');
        }

        // 2. Perform Signup
        const { data: authData, error: signUpError } = await signUp(email, password);
        if (signUpError) throw signUpError;

        // 3. Auto-link to mentor and finalize
        if (authData?.user) {
          // Add mentorship record
          await supabase.from('mentorships').insert([{
            mentor_id: inv.invited_by,
            student_id: authData.user.id
          }]);
          
          // Use the invitation info if we want to delete it or keep it as 'accepted'
          // For now, let's just delete it to keep things clean
          try {
            await supabase.from('invitations').delete().eq('id', inv.id);
          } catch (delErr) {
            console.warn("Could not delete invitation record:", delErr);
          }
        }

        if (authData?.session) {
          alert('Conta criada com sucesso! Entrando...', 'success');
        } else {
          alert('Conta criada com sucesso! Verifique seu e-mail para confirmar e fazer login.', 'success');
          setIsLogin(true);
        }
      }
    } catch (e) {
      alert(e.message || 'Erro ao autenticar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse transition-all duration-[3s]" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 mb-6 group transition-all hover:bg-indigo-600/20">
            <Brain className="text-indigo-400 group-hover:scale-110 transition-transform duration-300" size={40} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Camada 3 <span className="text-indigo-400">HBC</span></h1>
          <p className="text-zinc-500 text-sm font-medium">Sua aprovação começa com foco absoluto.</p>
        </header>

        <Card className="p-1 bg-zinc-900/50 backdrop-blur-xl border-zinc-800/50 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-8">
            <div className="flex bg-zinc-950/50 p-1 rounded-xl mb-8 border border-zinc-800">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${isLogin ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${!isLogin ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Cadastro
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">E-mail</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-600 group-focus-within:text-indigo-400 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-zinc-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Senha</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-600 group-focus-within:text-indigo-400 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-zinc-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-xl shadow-indigo-900/40 h-14 rounded-2xl text-sm font-black tracking-widest uppercase mt-4 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    {isLogin ? 'Entrar no Dashboard' : 'Criar Minha Conta'}
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="p-6 bg-zinc-950/50 border-t border-zinc-800/50 text-center">
            <p className="text-zinc-600 text-[10px] uppercase font-bold tracking-tighter">
              {isLogin ? 'Novo por aqui?' : 'Já possui conta?'}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {isLogin ? 'Cadastre-se para começar' : 'Faça login agora'}
              </button>
            </p>
          </div>
        </Card>

        <footer className="mt-12 text-center">
          <p className="text-zinc-800 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
            <Rocket size={12} className="text-zinc-800" />
            Powered by High Performance Protocol
          </p>
        </footer>
      </div>
    </div>
  );
}
