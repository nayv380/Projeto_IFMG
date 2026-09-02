import React, { type ReactNode } from 'react';
import { useForm, type SubmitHandler, type FieldValues, type UseFormProps, type UseFormReturn } from 'react-hook-form';
import '../styles/authform.css'

// Tipamos com Generics <T> para que o formulário saiba exatamente quais campos existem (ex: email, senha)
export interface AuthFormProps<T extends FieldValues> {
  /** Função executada ao submeter o formulário (só é chamada se não houver erros de validação) */
  onSubmit: SubmitHandler<T>;
  
  /** Configurações do hook form, como valores padrão (defaultValues) ou validações com Zod/Yup (resolver) */
  formOptions?: UseFormProps<T>;
  
  /** Slot para os botões de alternância do topo (Ex: abas Login / Criar Conta) */
  headerToggleSlot?: ReactNode;
  
  /** Slot para o botão de ação principal na base do formulário */
  actionSlot: ReactNode;
  
  /** * MUDANÇA PRINCIPAL: O children agora é uma função. 
   * Ele recebe as ferramentas do react-hook-form para podermos injetar nos Inputs.
   */
  children: (methods: UseFormReturn<T>) => ReactNode;
  className?: string;
}

const AuthForm = <T extends FieldValues>({
  onSubmit,
  formOptions,
  headerToggleSlot,
  children,
  actionSlot,
  className = '',
}: AuthFormProps<T>): React.JSX.Element => {
  
  // Inicializa o gerenciador de estado do formulário
  const methods = useForm<T>(formOptions);
  
  return (
    <>
      {/* O handleSubmit intercepta o evento padrão, valida os campos e depois chama o seu onSubmit */}
      <form 
      onSubmit={methods.handleSubmit(onSubmit)}
      noValidate 
      className={`auth-form-container ${className}`.trim()}
      >
        {headerToggleSlot && (
          <header className="auth-form-header">
            {headerToggleSlot}
          </header>
        )}

        <div className="auth-form-body">
          {/* Executamos a função children passando os métodos para que os Inputs acessem os erros e o registro */}
          {children(methods)}
        </div>

        <footer className="auth-form-footer">
          {actionSlot}
        </footer>
      </form>
    </>
  );
};

export default AuthForm;