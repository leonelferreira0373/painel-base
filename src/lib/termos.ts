// O que cada termo do painel quer dizer. Um termo aparece como etiqueta cinzenta («Firewall», «TTL», «Concluído») e, ao clicar, abre uma explicação a sério, com o que é, onde está e o que se pode fazer com ele. Aqui estão as explicações: um glossário técnico, o significado dos estados, as páginas do painel, as funções, os formatos de exportação e os tipos de ação. Um valor que não está aqui (o nome de um registo, um número) é só um destaque: não abre nenhuma explicação, em vez de fingir uma.
import { significadoDoEstado } from "@/dados/dicas";
import { AREAS } from "@/dados/estrutura";
import { SECOES_CONTA } from "@/dados/conta";
import { FUNCOES } from "@/dados/rbac";
import { ROTULO_DO_TIPO } from "./atividade";
import { FORMATOS } from "./exportar/formatos";

export interface ExplicacaoDeTermo {
  /** O que é: «Termo técnico», «Estado», «Página do painel»… */
  tipo: string;
  /** A explicação por extenso. */
  texto: string;
  /** Onde está ou a que pertence (opcional). */
  onde?: string;
  /** Se há uma explicação a sério (senão a etiqueta não abre nada). */
  conhecido: boolean;
}

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const GLOSSARIO: Record<string, string> = {
  ttl: "Tempo de vida: quanto tempo (em segundos) os outros servidores podem guardar a resposta de um registo DNS antes de a pedirem de novo. Um TTL curto (60 s) faz as mudanças valerem depressa; um comprido (1 dia) poupa pedidos. «Auto» deixa o fornecedor escolher.",
  dns: "O sistema que traduz o nome de um site (exemplo.com) no endereço da máquina que o serve. Cada nome tem registos (A, MX, TXT…) que dizem para onde vai o site, o e-mail e as verificações.",
  mx: "Registo DNS que diz que servidor recebe o e-mail de um domínio. Cada MX tem uma prioridade: o número mais baixo tenta-se primeiro.",
  cname: "Registo DNS que faz de um nome um apelido de outro («www» é apelido de «exemplo.com»). Não pode existir no próprio domínio, só em nomes dentro dele.",
  a: "Registo DNS que liga um nome a um endereço IPv4 (203.0.113.10). É o que faz o domínio chegar ao servidor.",
  aaaa: "Registo DNS que liga um nome a um endereço IPv6 (2001:db8::1), a versão mais recente dos endereços de internet.",
  txt: "Registo DNS de texto livre. Serve para provar que o domínio é seu e para o e-mail (SPF, DKIM e DMARC vivem em registos TXT).",
  ns: "Registo DNS que diz quais são os servidores que respondem por um domínio.",
  srv: "Registo DNS que diz onde está um serviço (a máquina e a porta), por exemplo o de chamadas ou de chat. Tem prioridade, peso, porta e destino.",
  caa: "Registo DNS que diz que entidades podem emitir certificados (https) para o domínio. Protege contra certificados emitidos por engano.",
  ptr: "Registo DNS inverso: do endereço IP para o nome. Os servidores de e-mail verificam-no; sem ele o correio pode ir para o lixo.",
  spf: "Verificação de e-mail: lista os servidores autorizados a enviar e-mail em nome do domínio, num registo TXT. Sem ela, o correio é mais facilmente marcado como lixo.",
  dkim: "Verificação de e-mail: cada mensagem sai com uma assinatura digital que o destinatário confirma com uma chave pública guardada no DNS. Prova que o e-mail não foi alterado.",
  dmarc: "Política de e-mail: diz ao destinatário o que fazer quando o SPF e o DKIM falham (nada, quarentena ou rejeitar) e para onde enviar os relatórios.",
  bind: "O formato de ficheiro de zona DNS mais usado (dos servidores BIND, mas aceite pela Cloudflare e quase todos). Serve para exportar e importar todos os registos de um domínio de uma vez.",
  iban: "Número internacional de conta bancária: o país, dois dígitos de controlo e a conta. O painel confirma-o pelo módulo 97, por isso um erro de escrita é apanhado antes de guardar.",
  utm: "Etiquetas que se juntam a uma ligação (fonte, meio, campanha) para saber de onde vieram os visitantes no Marketing.",
  rls: "Segurança por linha: a base de dados só deixa cada pessoa ver as linhas que lhe pertencem. Ligada, as regras («políticas») decidem quem vê o quê.",
  cidr: "A forma de escrever uma gama de endereços IP («203.0.113.0/24» são os 256 endereços de 203.0.113.0 a 203.0.113.255). Usa-se nas regras do firewall.",
  neurons: "A unidade em que a Cloudflare mede o que a IA gasta (cada chamada gasta algumas centenas). A conta gratuita dá 10 000 por dia; o painel pára antes de pagar.",
  tokens: "Os pedaços de texto em que a IA lê e escreve (uma palavra tem entre 1 e 3). O contexto de um modelo é o máximo de tokens que cabe numa conversa.",
  token: "Uma chave secreta que dá acesso à API do painel, com as permissões que se escolherem. Mostra-se uma única vez, quando se cria; depois só se pode rodar ou apagar.",
  api: "O conjunto de endereços por onde outro programa (ou uma IA) fala com o painel: ler dados, criar registos, ligar e desligar coisas. Cada pedido leva um token.",
  firewall: "A barreira à frente do site: bloqueia endereços e países, limita pedidos por minuto e deixa passar o resto.",
  rollback: "Voltar a uma versão anterior do site, que passa a receber todo o tráfego. É o remédio rápido quando uma versão nova corre mal.",
  "a b": "Teste A/B: duas versões do site em simultâneo, com uma parte do tráfego na B, para ver qual funciona melhor antes de passar tudo para uma.",
  deploy: "Publicar uma versão nova do site no servidor.",
  commit: "Um conjunto de mudanças guardado no repositório de código, com um identificador, um autor e uma mensagem.",
  ramo: "Uma linha de trabalho paralela no repositório (por exemplo «main» e «desenvolvimento»); a versão publicada sai de um ramo.",
  vps: "Servidor privado virtual: uma máquina alugada onde o site e o painel correm.",
  cache: "Cópias guardadas para responder mais depressa. Limpá-la obriga a ir buscar tudo de novo.",
  smtp: "O protocolo e o servidor que enviam o e-mail. Precisa de endereço, porta, utilizador e palavra-passe do fornecedor.",
  ocr: "Reconhecimento de texto em imagens: lê o texto de uma fotografia ou de um PDF digitalizado.",
  csv: "Ficheiro de texto com uma linha por registo e colunas separadas por «;» ou vírgulas. Abre no Excel.",
  json: "Formato de texto que guarda dados estruturados (campos e valores), o preferido de programas e de IAs.",
  zip: "Ficheiro que junta vários ficheiros comprimidos num só.",
  "pdf": "Documento fixo, bom para ler e imprimir; não se edita facilmente.",
  ip: "O endereço de uma máquina na internet; mostra de onde alguém se ligou.",
  webhook: "Um endereço que o painel chama sozinho quando acontece algo (um pagamento, um pedido), para avisar outro sistema.",
  ssl: "A cifra que protege a ligação ao site (o cadeado do https).",
  cdn: "Rede de servidores que guarda cópias do site perto de quem o vê, para carregar mais depressa.",
  "2fa": "Verificação em dois passos: além da palavra-passe, um código de uma aplicação ou do telemóvel.",
  "ia": "Inteligência artificial: aqui, o assistente do chat, a pesquisa em linguagem natural e a análise a fundo.",
  "reconn": "Reconhecimento: a pesquisa a fundo da IA sobre um tema, na internet e nos dados do painel, que acaba num documento com fontes.",
};

/** Uma ação, botão, tecla ou estado do painel que se cita numa frase como «termo». */
interface EntradaDoPainel {
  tipo: string;
  texto: string;
  onde?: string;
}

/** Cada uma com o rótulo tal como aparece no ecrã. */
const ENTRADAS: [string, EntradaDoPainel][] = [
  ["Investigar com IA", { tipo: "Ação do menu", onde: "Menu de três pontos dos cartões, das listas e dos registos", texto: "Pede à IA uma análise a fundo do cartão, da lista ou do registo onde carregou nos três pontos. Abre a janela «Analisar com IA», onde escolhe a profundidade (rápida, normal ou profunda), o tamanho da resposta e se a IA também pesquisa na internet. A análise entra numa fila, corre em segundo plano e a IA avisa no chat quando acabar; acompanha-se em «Pesquisa em curso»." }],
  ["Analisar com IA", { tipo: "Janela", texto: "A janela onde se pede uma análise a fundo à IA: o que quer saber (opcional), a profundidade da pesquisa (rápida, cerca de 1 minuto; normal, cerca de 2; profunda, cerca de 5), o tamanho da resposta (curta, equilibrada, detalhada ou extensa), a ênfase e se pode pesquisar na internet. «Começar» põe a análise na fila." }],
  ["Pesquisa em curso", { tipo: "Painel da IA", texto: "O painel das análises a fundo da IA. Lista as que estão na fila, a pesquisar, em pausa ou acabadas, com os passos já dados, as fontes consultadas e o resultado. Pode acompanhar uma análise em direto e mandar-lhe uma correção a meio para a IA mudar de rumo." }],
  ["Perguntar à IA", { tipo: "Ação do menu", texto: "Abre o chat da IA já com uma pergunta sobre este cartão, lista ou registo, e envia-lhe os dados que estão no ecrã para ela responder com base neles." }],
  ["Deixar nota", { tipo: "Ação do menu", texto: "Escreve uma nota adesiva presa a este cartão, lista ou janela. Pode ser só para si ou para outras pessoas, ter data para expirar, palavra-passe e lembretes por e-mail." }],
  ["Copiar dados", { tipo: "Ação do menu", texto: "Copia a informação do cartão ou da lista como texto legível (o título, os campos com os valores, e de que página e quando foi copiada), pronta para colar num documento ou numa conversa com a IA." }],
  ["Copiar como imagem", { tipo: "Ação do menu", texto: "Copia o cartão ou o gráfico como uma imagem, para colar num documento ou numa mensagem." }],
  ["Alterar", { tipo: "Botão", onde: "Definições da conta > Atalhos", texto: "O botão ao lado de cada atalho de teclado. Carregue nele e prima a nova combinação: fica guardada logo. «Esc» cancela." }],
  ["Esc", { tipo: "Tecla", texto: "A tecla Escape. Fecha a janela ou o menu que está aberto e, nos atalhos, cancela a gravação de uma combinação nova." }],
  ["Igual ao sistema", { tipo: "Opção do tema", onde: "Definições da conta > Aparência", texto: "O painel acompanha o aparelho: fica claro de dia e escuro à noite, conforme a definição do telemóvel ou do computador." }],
  ["Personalizado", { tipo: "Escolha feita à mão", texto: "O que fica quando muda alguma coisa de um pacote ou de um modelo: em vez de uma das opções prontas, passa a ser a sua combinação. Pode voltar a uma opção pronta quando quiser." }],
  ["Carregar ficheiros", { tipo: "Botão", onde: "Ficheiros", texto: "Escolhe ficheiros do seu aparelho para os guardar na pasta aberta. Também pode largá-los na área da pasta." }],
  ["Carregar imagens", { tipo: "Botão", onde: "Galeria", texto: "Escolhe imagens do seu aparelho para as juntar à galeria. Ficam guardadas neste navegador." }],
  ["Preferências de cookies", { tipo: "Ligação", texto: "Abre a janela onde decide que cookies aceita: os essenciais são sempre necessários e os de análise e de marketing são opcionais. Pode mudar a escolha a qualquer momento." }],
  ["Falar com a equipa", { tipo: "Botão do assistente", texto: "Passa a conversa do assistente para uma pessoa da equipa. Indique o número do pedido para a resposta ser mais rápida." }],
  ["Novo registo", { tipo: "Botão", texto: "Cria um registo novo no módulo aberto (por exemplo, um pedido de transporte). Preencha os campos obrigatórios e guarde: o registo aparece logo na lista." }],
  ["Definições da conta", { tipo: "Espaço pessoal", texto: "O sítio onde trata da sua conta: perfil, segurança, e-mail e telefone, notificações, lembretes, aparência, atalhos, tokens da API, exportar e dados e privacidade." }],
  ["Em análise", { tipo: "Estado", texto: "O pedido foi recebido e está a ser avaliado: ainda não há decisão." }],
  ["Confirmado", { tipo: "Estado", texto: "O pedido foi aceite e está marcado. Já não precisa de nenhuma decisão." }],
  ["Recusado", { tipo: "Estado", texto: "O pedido não foi aceite. Pode ver a razão no registo e fazer um novo pedido, se fizer sentido." }],
  ["Novo", { tipo: "Estado", texto: "Acabou de aparecer e ainda ninguém lhe pegou. Passa a outro estado quando alguém o tratar." }],
  ["Agendada", { tipo: "Estado", texto: "Tem data e hora marcadas: sai sozinha à hora definida, sem ninguém carregar em nada." }],
  ["A enviar", { tipo: "Estado", texto: "Está a ser enviada agora a toda a audiência. Quando acabar passa a enviada, com os números de entregues, abertos e falhas." }],
  ["dados de demonstração", { tipo: "Modo de ligação", texto: "O painel funciona sozinho, no navegador, com dados de exemplo e sem servidor. Para usar dados reais, ligue-o a um servidor que cumpra o contrato da API." }],
  ["bpt_", { tipo: "Prefixo", texto: "O início de todos os tokens criados no painel («bpt_» e 40 letras e números). Serve para reconhecer um token do painel, por exemplo se for colado por engano num sítio público." }],
  ["desde", { tipo: "Parâmetro da API", texto: "Filtro de um pedido: só devolve o que aconteceu depois deste momento. Chamado de segundo a segundo, dá o tempo real." }],
  ["antes", { tipo: "Parâmetro da API", texto: "Filtro de um pedido: só atua sobre o que é anterior a esta data (por exemplo, só apaga as linhas mais antigas)." }],
  ["contagem", { tipo: "Cálculo", texto: "Conta os registos de cada ponto do gráfico, sem somar nenhum valor." }],
  ["default", { tipo: "Seletor do DKIM", texto: "O nome da chave de assinatura do e-mail: a chave pública fica no DNS em «default._domainkey» do seu domínio e o servidor assina cada mensagem com a chave privada correspondente." }],
  ["quentes", { tipo: "Termo do Marketing", texto: "As páginas do site mais vistas, com o tempo médio de leitura e a taxa de rejeição (quem sai sem fazer mais nada)." }],
  ["Rastreio", { tipo: "Página do Marketing", onde: "Marketing", texto: "Onde se vê como o site envia ao painel os eventos de visita e de clique, e o script que se instala no site para o fazer." }],
];

const ENTRADAS_POR_NOME = new Map(ENTRADAS.map(([rotulo, e]) => [norm(rotulo), e]));

/** Os tipos de estado comuns, para o aviso de onde se vê. */
const NOME_DO_TIPO: Record<string, string> = { sessao: "Sessão", navegacao: "Navegação" };

/** Explica um termo. `contexto` ajuda quando o termo é parte de outra coisa (por exemplo, um pedaço de uma rota do site). */
export function explicarTermo(termo: string, contexto?: string): ExplicacaoDeTermo {
  const n = norm(termo);
  const g = GLOSSARIO[n];
  if (g) return { tipo: "Termo técnico", texto: g, conhecido: true };

  const entrada = ENTRADAS_POR_NOME.get(n);
  if (entrada) return { ...entrada, conhecido: true };

  const estado = significadoDoEstado("*", termo);
  if (estado) return { tipo: "Estado", texto: estado, conhecido: true };

  for (const a of AREAS) {
    if (norm(a.rotulo) === n) return { tipo: "Área do painel", texto: `${a.rotulo} agrupa ${a.modulos.length} ${a.modulos.length === 1 ? "página" : "páginas"}: ${a.modulos.map((m) => m.rotulo).join(", ")}.`, conhecido: true };
    const m = a.modulos.find((x) => norm(x.rotulo) === n);
    if (m) return { tipo: "Página do painel", texto: m.descricao ?? `A página ${m.rotulo}.`, onde: a.rotulo, conhecido: true };
  }
  const s = SECOES_CONTA.find((x) => norm(x.rotulo) === n);
  if (s) return { tipo: "Definições da conta", texto: s.descricao, onde: "Definições da conta", conhecido: true };

  const f = FUNCOES.find((x) => norm(x.rotulo) === n);
  if (f) return { tipo: "Função", texto: `A função «${f.rotulo}» decide o que se vê e o que se pode mudar no painel. Aqui vê ${Object.keys(f.areas).length} áreas${f.fechados?.length ? `, com ${f.fechados.length} páginas fechadas` : ""}.`, conhecido: true };

  const fm = FORMATOS.find((x) => norm(x.rotulo) === n || norm(x.id) === n);
  if (fm) return { tipo: "Formato de exportação", texto: `Exporta-se em ${fm.rotulo} (ficheiro .${fm.extensao}). Os formatos que aparecem na janela de exportar ligam-se e desligam-se em Definições da conta > Exportar.`, conhecido: true };

  const tipoDeAcao = Object.values(ROTULO_DO_TIPO).find((x) => norm(x) === n);
  if (tipoDeAcao) return { tipo: "Tipo de ação", texto: `Nas sessões e atividade, as ações do tipo «${NOME_DO_TIPO[n] ?? tipoDeAcao}» agrupam o que se fez dessa natureza.`, onde: "Administração > Sessões e atividade", conhecido: true };

  // um pedaço de rota do site («Compras» dentro de «Compras > Homens»)
  if (contexto) return { tipo: "Página do site", texto: `«${termo}» é uma página (ou uma secção) do site. Aqui conta quantas vezes foi pedida ou clicada.`, onde: contexto, conhecido: true };

  // sem explicação a sério não se inventa uma: a etiqueta fica como destaque e não abre nada
  return { tipo: "Valor", texto: "", conhecido: false };
}

/** Quantos termos tem o glossário (para os testes). */
export const TERMOS_NO_GLOSSARIO = Object.keys(GLOSSARIO).length;
