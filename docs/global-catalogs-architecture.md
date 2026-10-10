# Preparação da Arquitetura para Integração com Catálogos Globais

Este documento analisa o estado atual do modelo de `Product` e `ProductVariant` e como ele foi desenhado para facilitar a futura integração com produtos importados de catálogos globais (ex: leitura de PDFs da Natura, Boticário, Eudora, etc).

## O Modelo Atual

Após as evoluções do projeto, o modelo se apresenta da seguinte forma:
- \`Product\`: Mantém os atributos básicos de qualquer produto comercializado, permitindo que os campos essenciais para revenda simples (como `nome`, `salePrice`) sejam obrigatórios, enquanto outros tornaram-se opcionais (`costPrice`, `code`, `barcode`, `description`, etc).
- \`ProductVariant\`: Nova entidade relacionada de 1 para N com \`Product\`. Uma variação contém o identificador da apresentação específica, código opcional, código de barras próprio e um campo de atributos (como \`{"cor": "preto", "tamanho": "M"}\`). Ela permite ainda herdar o preço do produto principal ou sobrescrever com um valor específico, bem como possuir estoque isolado.

## Visão da Integração Futura

Quando o sistema for capaz de ler PDFs de catálogos para sugerir produtos ou automatizar o preenchimento, os seguintes modelos deverão ser introduzidos:

### 1. `CatalogProduct` e `CatalogProductVariant` (Novo Domínio)
O sistema não deve poluir a tabela \`Product\` atual (que pertence ao estoque e portfólio da loja/revendedor) com milhares de produtos de catálogos não comercializados no momento.
Portanto, recomenda-se criar modelos apartados:
\`\`\`prisma
model CatalogProduct {
  id          String   @id @default(cuid())
  brand       String   // Natura, Eudora, etc
  cycle       String   // Ciclo 04/2024
  name        String
  description String?
  price       Decimal  // Preço de capa
  variants    CatalogProductVariant[]
}

model CatalogProductVariant {
  id               String   @id @default(cuid())
  catalogProductId String
  name             String   // Ex: 75 ml, Refil
  code             String   // Código do produto no catálogo
  price            Decimal?
}
\`\`\`

### 2. O Processo de Importação / "Match"

A arquitetura atual do \`Product\` foi adaptada para que seu cadastro seja o mais flexível possível ("Nome + Preço"). Assim, quando o usuário importar um produto de um catálogo global para seu portfólio, o sistema poderá fazer uma cópia transparente:
- \`Product.name\` receberá \`CatalogProduct.name\`.
- \`Product.salePrice\` receberá o preço que a revendedora deseja praticar (que inicialmente pode ser o preço sugerido no \`CatalogProduct\`).
- A integração criará automaticamente registros na tabela \`ProductVariant\` mapeando os \`CatalogProductVariant\`.

**Vantagens da Abordagem Adotada:**
1. **Preservação Histórica:** Como o \`SaleItem\` agora armazena tanto o nome do produto principal quanto o \`variantName\` da variação no momento da venda, as vendas passadas permanecem blindadas caso o produto mude ou seja removido de um catálogo.
2. **Independência:** O revendedor tem autonomia para editar preços e atributos do produto importado na sua própria tabela \`Product\` sem que as atualizações do Catálogo Global (que mudam a cada ciclo) interfiram em seu banco local inadvertidamente.
3. **Mapeamento Flexível:** O uso do campo JSON de \`attributes\` na variação (`ProductVariant`) permite que diferentes estruturas encontradas nos PDFs (onde um catálogo pode ter variações por "volume" e outro por "tom de pele") sejam mapeadas dinamicamente sem alterar o schema relacional no futuro.
