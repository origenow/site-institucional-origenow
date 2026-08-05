# Copy ancorada em operação real

Fonte: grupos de atendimento no WhatsApp (instância **Origenow**, 976 chats / 41.566 mensagens).
Lidos: Nativas Br, TS2, Riffel, ContMinas Handoff, + inventário dos 24 grupos ativos nos últimos 45 dias.
O Slack retornou `token_revoked` — não entrou na leitura.

---

## O que as conversas mostram

| Padrão observado | Evidência |
|---|---|
| **Grupo dedicado por cliente**, com o time do cliente e o nosso na mesma sala | 24 grupos `Cliente + Origenow` ativos; dúvida urgente respondida no mesmo dia |
| **Atendente assina com nome** | `*Nathan Santos I Atendimento Origenow*`, `*Allan Schwenck \| Atendimento Origenow*` |
| **Pauta semanal construída pelos dois lados** | Cliente: *"vai anotando essas pautas pra gente conversar na quarta-feira"*, *"coloca na pauta de hj o Macis"* |
| **Conta de margem conferida venda por venda** | *"temos o valor fixo, percentual, frete, anúncios patrocinados e afins… é bom ter o percentual para entender melhor o lucro"* |
| **Trabalho dentro da conta do cliente** | *"se possível me passar o acesso da conta, eu gostaria de já adiantar para nós e entender o que houve"* |
| **Habilitação de entrada**: conta, certificado digital, domicílio fiscal | Conta habilitada → contato da certificadora encaminhado; *"domicílio fiscal para mercadoria e afins"* |
| **Full ativado por região, com o CD que o canal indicar** | *"conseguimos ativar o full de mg e rio de janeiro"*; ML redirecionou para CD em Floripa |
| **Nota fiscal e coleta resolvidas na operação** | Transportadora recusou a NF: coleta no ES, destino em outro estado |
| **Chamados abertos e cobrados junto à plataforma** | Riffel: dois chamados por diferença de mercadoria recebida vs. enviada na Amazon; *"posso colocá-la nos chamados se quiser"* |
| **Vendor / 1P além de 3P** | POs, painel financeiro, janela de agendamento da Amazon reagendada e protestada |
| **Fiscal e ERP pelo grupo** | Handoff ContMinas: revisão de ERP no Tiny, Simples Nacional, conferência de tributações |
| **Resultado reportado no fluxo, não só no deck** | *"no Full já batemos em +10% o mês anterior"*; *"ontem tivemos a nossa primeira venda do Macis"* |

---

## Alterações aplicadas

**Home**
- Como trabalhamos → *grupo dedicado com o seu time e o nosso: sessão semanal com pauta aberta e resposta no mesmo dia*
- Por que data-driven → *taxa fixa, comissão, frete e Ads descontados venda por venda* (era "margem por SKU, taxa do canal e custo de mídia")
- Cadência semanal → *grupo dedicado no WhatsApp, com o atendente identificado por nome*; *pauta que vocês e nós alimentamos durante a semana*
- Camada Canal → *…com os chamados abertos e cobrados por nós*

**Serviços**
- Iniciar → *habilitação da conta, certificado digital e domicílio fiscal antes do primeiro anúncio*
- Migrar → *troca de operação, ERP e regime fiscal…*

**Consultoria** — Reputação e pós-venda → *…e chamados abertos e cobrados junto à plataforma*

**Logística** — Entrada no Full inclui nota fiscal; `FBA da Amazon` → **FBA e vendor (1P)** com *POs, janelas de coleta e conferência de recebimento*; Abastecimento → *ativação por região e rota consolidada até o CD que o canal indicar*

**Homologações** (Home + Sobre) — Shopee: *Parceiro de canal* → **Programa de Consultoria Selecionada**; Amazon SPN: *Service Provider Network* → **…e Mentor**

---

## 1P / vendor — como ficou

1P **não** virou um sexto serviço. Ninguém contrata "1P": é a modalidade de como você vende em cada canal, e ela atravessa as frentes que já existem. Um card 06 sugeriria que é alternativa à Consultoria, quando na verdade você precisa da Consultoria para operar 1P.

Ficou como seção própria em **Serviços → Modalidade: "3P, 1P ou os dois"** — comparação de quem define o preço, quem compra o estoque, quem atende o cliente, como o dinheiro entra e onde cada modalidade trava (buy box e Ads no 3P; janela de coleta e divergência de recebimento no 1P). Fecha com "onde nós entramos": Pesquisa decide, Consultoria opera as POs, Log-O faz o inbound.

Também: **Pesquisa** simula margem nas duas modalidades; **Logística** tem o card "FBA e vendor (1P)" com POs, janelas de coleta e conferência de recebimento.

Reaproveitei o grid `1.4fr 1fr 1fr` (já mapeado na Fase 2 → `1fr 1fr` em ≤991) para não criar padrão novo de reflow.

Aberto: se 1P virar receita relevante, a página de Consultoria merece um FAQ direto — *"Vendemos 1P para a Amazon. Vocês operam?"*

---

## Pendente de confirmação — não alterei

1. **Números dos cases** — `+186%`, `+212%`, `+134%`, `+9/+6/+11 p.p.` Não achei origem. Precisam de fonte ou saem.
2. ~~**Depoimentos**~~ — resolvido. Três depoimentos reais fornecidos pelo cliente: Diego Andrade (Mimo &amp; Cricut, full de SP), Bianca Amorim (OneShop, Anye) e Débora Calixto (Camicado, catálogo Amazon). Falta apenas a foto de cada um nos slots `depo-1/2/3`.
3. ~~**Exclusividade**~~ — resolvido pelo cliente. Não existe exclusividade em Consultoria: o FAQ "Vocês atendem um concorrente meu?" agora responde que pode acontecer e aponta a Representação digital como a única frente com exclusividade. Em Representação a exclusividade é real e é a contrapartida do convite — a Origenow convida a marca quando abre vaga na categoria. O selo "Serviço por convite" (Header + card 05 de Serviços) está correto e permanece.
4. **Google Partner** e **Meta Business Partner** — vêm do design system, sem lastro nas conversas.
5. **Webcontinental (parceiro reseller)** e **TikTok Shop** têm grupo ativo e não aparecem com o mesmo peso na página.
6. **"Resposta em 2 dias úteis"** no formulário — na prática o atendimento responde no mesmo dia. Pode subir a régua.
