# 🚀 Plataforma de Gestão de Hackathons (Projeto Internacional - Latinaton)

[![Status do Projeto](https://img.shields.io/badge/status-concluído-brightgreen.svg)]()
[![Tecnologias](https://img.shields.io/badge/stack-Full%20Stack-blue.svg)]()
[![Escopo](https://img.shields.io/badge/escopo-Internacional-orange.svg)]()
[![Licença](https://img.shields.io/badge/licença-MIT-green.svg)]()

> Sistema Full Stack desenvolvido para gerenciar grandes maratonas de programação e hackathons internacionais, integrando participantes de múltiplos países (Brasil, Colômbia e México).

---

## 🌎 Sobre o Projeto

A **Plataforma de Gestão de Hackathons** nasceu no contexto de iniciativas internacionais de inovação (como o projeto Latinaton, em parceria com instituições como IFMG, CEPEDI e Softex). A solução foi estruturada para centralizar, automatizar e dar suporte a competições de tecnologia de larga escala em âmbito global. 

A plataforma gerencia todo o ciclo de vida do evento: desde a inscrição unificada de competidores de diferentes nacionalidades, passando pela formação autônoma de equipes multiculturais, acompanhamento de atividades em tempo real, até submissões de projetos e avaliações por bancas julgadoras internacionais.

---

## 👩‍💻 Liderança e Papel Técnico

* **Cargo:** **Lead Front-End** (Liderança da equipe de desenvolvimento Front-End)
* **Responsabilidades:** Concepção e direcionamento de arquitetura de interface, prototipagem de fluxos interativos (UI/UX) e integração fluida com o ecossistema de APIs globais da aplicação.

---

## 🛠 Tecnologias Utilizadas

### **Backend**
* **[Python](https://www.python.org/)**
* **[Django](https://www.djangoproject.com/)** & **[Django REST Framework (DRF)](https://www.django-rest-framework.org/)**
* Banco de Dados Relacional configurável via variáveis de ambiente

### **Frontend & Design**
* **[React](https://react.dev/)** com **[Vite](https://vitejs.dev/)** e **[TypeScript](https://www.typescriptlang.org/)**
* **[Tailwind CSS](https://tailwindcss.com/)** para estilização responsiva e moderna
* **[Figma](https://www.figma.com/)** para prototipagem e design system

---

## 📁 Arquitetura e Estrutura do Repositório

```text
Projeto_IFMG/
├── backend/            # API REST em Django (Models, Serializers, Views e Apps)
│   ├── atividades/     # Gestão de tarefas, prazos e entregas
│   ├── eventos/        # Gerenciamento de hackathons e lotes de inscrição[cite: 1]
│   ├── grupos/         # Formação e gestão colaborativa de equipes[cite: 1]
│   ├── identity/       # Controle de acesso e autenticação[cite: 1]
│   ├── mural/          # Mural de avisos e comunicados em tempo real[cite: 1]
│   ├── plataforma/     # Configurações centrais do Django (settings, urls)[cite: 1]
│   └── usuarios/       # Gestão de perfis e papéis[cite: 1]
└── frontend/           # Aplicação Client-Side em React + TypeScript + Vite
    ├── docs/           # Documentações de APIs e componentes[cite: 1]
    ├── src/
    │   ├── components/ # Componentes reutilizáveis de interface e modais[cite: 1]
    │   ├── context/    # Contextos globais (Auth, Event, Group)[cite: 1]
    │   ├── pages/      # Páginas da aplicação e dashboards administrativos[cite: 1]
    │   ├── services/   # Configuração do cliente HTTP (Axios) e rotas da API[cite: 1]
    │   └── utils/      # Funções utilitárias e formatadores de dados[cite: 1]
    └── ...
