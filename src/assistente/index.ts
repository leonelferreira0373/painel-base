// O que o painel importa do assistente: o chat (a cópia local, com a interface do painel) e os tipos do transporte. A lógica pura e os estilos vêm do pacote ai-chat.
export { AssistenteIA, type PropsDoAssistenteIA } from "./AssistenteIA";
export type { AnexosDoAssistente, ItemDoMenuExtra } from "./cliente/extensoes";
export type { EventoDoTransporte, MensagemRemota, PedidoDeResposta, TransporteDoAssistente } from "./cliente/transporte";
