import React, { createContext, useContext, useState, useCallback } from 'react';
import { Button } from '../components/ui/Button';
import { X, CheckCircle, AlertCircle, Info, Trash2 } from 'lucide-react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null);

    const alert = useCallback((message, type = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        
        // Auto remove toast after 5 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const confirm = useCallback((message, options = {}) => {
        return new Promise((resolve) => {
            setConfirmDialog({
                message,
                resolve,
                title: options.title || 'Confirmação',
                confirmText: options.confirmText || 'Confirmar',
                cancelText: options.cancelText || 'Cancelar',
                variant: options.variant || 'primary'
            });
        });
    }, []);

    const closeConfirm = (value) => {
        if (confirmDialog) {
            confirmDialog.resolve(value);
            setConfirmDialog(null);
        }
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <NotificationContext.Provider value={{ alert, confirm }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none">
                {toasts.map(toast => (
                    <div 
                        key={toast.id}
                        className="pointer-events-auto animate-in slide-in-from-right-full duration-300 flex items-center gap-4 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-4 rounded-2xl shadow-2xl shadow-black/40"
                    >
                        <div className={`p-2 rounded-full ${
                            toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                            toast.type === 'error' ? 'bg-rose-500/10 text-rose-400' :
                            'bg-indigo-500/10 text-indigo-400'
                        }`}>
                            {toast.type === 'success' ? <CheckCircle size={20} /> :
                             toast.type === 'error' ? <AlertCircle size={20} /> :
                             <Info size={20} />}
                        </div>
                        <p className="text-sm font-medium text-zinc-200 flex-1">{toast.message}</p>
                        <button onClick={() => removeToast(toast.id)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Confirm Dialog */}
            {confirmDialog && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center">
                            <div className={`mb-6 p-4 rounded-full ${
                                confirmDialog.variant === 'danger' ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-400'
                            }`}>
                                {confirmDialog.variant === 'danger' ? <Trash2 size={32} /> : <AlertCircle size={32} />}
                            </div>
                            <h3 className="text-xl font-bold text-zinc-100 mb-2">{confirmDialog.title}</h3>
                            <p className="text-zinc-400 mb-8 leading-relaxed">{confirmDialog.message}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button 
                                variant="ghost" 
                                fullWidth 
                                onClick={() => closeConfirm(false)}
                                className="order-2 sm:order-1"
                            >
                                {confirmDialog.cancelText}
                            </Button>
                            <Button 
                                variant={confirmDialog.variant} 
                                fullWidth 
                                onClick={() => closeConfirm(true)}
                                className="order-1 sm:order-2"
                            >
                                {confirmDialog.confirmText}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
