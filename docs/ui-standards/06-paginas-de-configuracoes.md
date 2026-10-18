# 06 - Páginas de Configurações

Este documento define os padrões visuais, comportamentais e de segurança para páginas de configurações, preferências da loja e administração de dados no **Zelo** (tendo como referência primária a tela `/configuracoes`).

---

## 1. Visão Geral da Estrutura de Configurações

Diferente de sistemas tradicionais que espalham configurações em dezenas de abas laterais, o Zelo adota uma abordagem de **painel contínuo organizado em seções verticais modulares**:

```text
+--------------------------------------------------------------------------+
| CABEÇALHO GLOBAL (/configuracoes)                                        |
+--------------------------------------------------------------------------+
| [CARD 1: DADOS DA LOJA]                               [ Chevron Down v ] |
| (Campos cadastrais, endereço com ViaCEP, telefone e documento)           |
+--------------------------------------------------------------------------+
| [CARD 2: NOTIFICAÇÕES & ESTOQUE]                      [ Chevron Down v ] |
| (Switches de alerta de estoque mínimo, avisos de venda sem saldo)        |
+--------------------------------------------------------------------------+
| [CARD 3: REGRAS DE VENDAS]                            [ Chevron Down v ] |
| (Exigência de cliente no PDV, bloqueio de venda sem estoque, formas pagto)|
+--------------------------------------------------------------------------+
| [CARD 4: GRUPOS DE ACESSO & PERMISSÕES (RBAC)]        [ Chevron Down v ] |
| (Gerenciamento de papéis, permissões granulares por módulo e vendedor)   |
+--------------------------------------------------------------------------+
| [CARD 5: GERENCIAMENTO DE DADOS & CONTA (ZONA CRÍTICA)] [ Chevron Down v ]|
| (Exclusão seletiva de histórico ou exclusão definitiva com senha)        |
+--------------------------------------------------------------------------+
```

---

## 2. Padrão de Cards de Seção Expansíveis

Cada bloco de configuração reside dentro de um `Card` independente com abertura articulada:

```tsx
<Card className="mb-4">
  <CardHeader className="py-4">
    <button
      type="button"
      onClick={() => setIsSectionExpanded((prev) => !prev)}
      className="flex w-full items-center justify-between text-left cursor-pointer group hover:opacity-80 transition-opacity"
      aria-expanded={isSectionExpanded}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <CardTitle className="text-base font-semibold text-foreground">
          {sectionTitle}
        </CardTitle>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
        <BoxIcon
          name="chevron-down"
          className={cn(
            "text-base transition-transform duration-200",
            isSectionExpanded && "rotate-180"
          )}
        />
      </div>
    </button>
  </CardHeader>

  {isSectionExpanded && (
    <CardContent className="space-y-4 pt-0 animate-in fade-in-50 duration-150">
      {/* Formulários, Switches e Controles da Seção */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
        <Button
          type="button"
          variant="outline"
          disabled={!hasChanges || busy}
          onClick={handleReset}
        >
          Descartar alterações
        </Button>
        <LoadingButton
          loading={busy}
          disabled={!hasChanges}
          onClick={handleSave}
        >
          Salvar alterações
        </LoadingButton>
      </div>
    </CardContent>
  )}
</Card>
```

### 2.1. Regras do Card Expansível:
1. **Cabeçalho Interativo Total:** Toda a área do `CardHeader` funciona como disparador de toque com `aria-expanded` para leitores de tela.
2. **Ícone com Rotação Fluida:** BoxIcon `chevron-down` com classe `transition-transform duration-200` e classe `rotate-180` quando aberto.
3. **Animação de Entrada:** Conteúdo expandido recebe `animate-in fade-in-50 duration-150` para evitar saltos visuais secos.

---

## 3. Comparação de Estado Original (Salvar vs. Descartar)

Para evitar gravações acidentais e dar clareza de estado ao lojista, as seções de formulários complexos mantêm dois estados:
1. `form`: Valores atuais editados pelo usuário na tela.
2. `original`: Valores espelhados diretamente do banco de dados na última sincronização.

- **Detecção de Alterações:** O botão `Salvar` e o botão `Descartar` permanecem desabilitados (`disabled`) enquanto `form === original`.
- **Feedback:** Ao salvar com sucesso, atualiza-se o estado `setOriginal(form)` para desabilitar novamente o botão e emite-se `toast.success("Dados atualizados com sucesso")`.

---

## 4. Seção de Gerenciamento de Dados (Ações Críticas)

A seção de administração de dados lida com ações destrutivas irreversíveis:
1. **Excluir todos os dados operacionais:** Remove vendas, produtos e clientes avulsos, preservando a conta, o usuário administrador e os registros padrão (*Consumidor Final* e categoria *Geral*).
2. **Excluir conta definitivamente:** Apaga a loja e todos os acessos de forma irreversível.

### 4.1. Regras de Segurança e Interface:
- **Autenticação Obrigatória:** O modal exige obrigatoriamente que o administrador digite sua senha de acesso atual em um campo `<Input type="password" />`. O botão de exclusão permanece bloqueado até o preenchimento.
- **Padrão Híbrido de Confirmação:**
  - No **Mobile**: Abre em `Drawer blur` (`max-h-[85vh]`) com título em tom vermelho, ícone de aviso e botões verticais na base.
  - No **Desktop**: Abre em `AlertDialog` centralizado (`max-w-md p-6`) com ícone BoxIcon `error-circle` ou `skull`.
- **Tratamento de Loading:** Durante a requisição de exclusão, exibe botão com spinner `bx-spin` e bloqueia qualquer fechamento do diálogo.

---

## 5. Seção de Grupos de Acesso (RBAC)

Localizada no subcomponente `src/components/configuracoes/groups-section.tsx`:
- Lista os grupos de acesso da loja (ex.: Administrador, Vendedor, Caixa).
- Grupos padrão protegidos (ex.: Grupo Administrador) não podem ter permissões fundamentais removidas.
- A edição de permissões é organizada por módulo (`dashboard`, `nova-venda`, `produtos`, `clientes`, `historico`, `usuarios`, `configuracoes`) e ação (`Visualizar`, `Adicionar`, `Editar`, `Excluir`), utilizando controles de alternância `Switch`.
