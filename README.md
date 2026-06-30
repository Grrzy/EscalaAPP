# 🕒 EscalaApp - Gestão Inteligente de Escalas 6x1

![Version](https://img.shields.io/badge/version-1.5-gold)
![Status](https://img.shields.io/badge/status-Operacional-success)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)

O **EscalaApp** é uma aplicação web *Client-Side* projetada para resolver a complexidade logística de operações críticas de atendimento 24/7. O sistema automatiza o rodízio de equipes no regime 6x1, garantindo auditoria em tempo real, validação de leis trabalhistas (CLT) e exportação de relatórios corporativos.

## 🎯 O Problema Resolvido
Operações de TI e Suporte Técnico exigem cobertura contínua (24/7). Gerenciar folgas, domingos trabalhados, quebras de ciclo (Folga Dupla) e trocas manuais de turno em planilhas gera riscos de passivo trabalhista e lacunas no atendimento (SLA). Este sistema aplica um motor matemático que calcula ciclos perpétuos de escala, bloqueando ações que ferem regras operacionais.

## ✨ Principais Funcionalidades

* **Motor Matemático de Rotação Inifinita:** Distribuição automática e cravada em UTC de 6 grupos (A ao F), garantindo folgas alternadas e o direito a uma Folga Dupla (Sábado e Domingo) mensal por grupo.
* **Validador de Compliance (CLT e Operação):**
  * Bloqueio automático de quebras de Interjornada (mínimo de 11h de descanso).
  * Prevenção de 7 dias consecutivos de trabalho.
  * Proteção de Headcount: Impede trocas que reduzam a equipe para menos de 2 colaboradores nos horários de ponta (06h e 23h).
  * Proteção de Picos: Bloqueia a alocação de folgas manuais às Segundas e Terças-feiras.
* **Dashboard Analítico e Filtros Avançados:** Interface em *Flexbox* com filtros de ordenação multicamadas (Status Operacional, Grupo, Matrícula, Ordem Alfabética).
* **Exportação Analítica Profissional (ExcelJS):** Geração nativa de arquivos `.xlsx` contendo abas coloridas e formatadas condicionalmente para o Mapa Operacional, Cobertura por Hora e Resumo Estatístico.
* **Persistência Local e Portabilidade:** Salva dados em `localStorage` com suporte total a Backup e Restauração via arquivos JSON (FileReader API).

## 🛠️ Tecnologias Utilizadas

* **Frontend:** HTML5, CSS3 (CSS Variables, Flexbox, Layout de Dashboard).
* **Lógica e Motor:** JavaScript Vanilla (ES6+).
* **Bibliotecas Externas:** [ExcelJS](https://github.com/exceljs/exceljs) (Para processamento robusto de planilhas Excel via Client-Side).
* **Gerenciamento de Dados:** DOM Storage API (`localStorage`), File API (`FileReader`).

## 🚀 Como Executar o Projeto

Por ser uma aplicação estritamente *Client-Side*, não é necessário configurar servidores ou bancos de dados locais.

1. Faça o clone do repositório:
   ```bash
   git clone [https://github.com/SEU_USUARIO/escalaapp.git](https://github.com/SEU_USUARIO/EscalaAPP.git)
   
 2. Navegue até a pasta do projeto.

 3. Abra o arquivo index.html em qualquer navegador web moderno (Chrome, Edge, Firefox).

 4. O sistema estará pronto para uso offline!

## 🔄 Fluxo de Importação/Exportação

    Cadastre seus funcionários na aba Novo Funcionário.

    Vá em Exportar Dados para gerar o seu escalaapp_backup_dados.json.

    Para usar em outra máquina, basta transferir o arquivo JSON, abrir o app e clicar em Importar Dados.

Projeto desenvolvido como solução arquitetural para gestão de operações de TI e atendimento ao cliente.
