// Números de telefone, com a mesma ideia do IBAN: o indicativo do país escolhe-se de uma lista (ou reconhece-se sozinho quando se cola um número com «+244», «+351»… ou «00244») e quem preenche só escreve o número nacional. Funções puras: a lista de países, reconhecer o indicativo, limpar e escrever em grupos, ler um número guardado e validar o comprimento.

export interface PaisTelefone {
  /** O código de duas letras («AO»). */
  iso: string;
  nome: string;
  /** O indicativo sem o «+» («244»). Alguns países da América do Norte levam também o código de zona («1242»). */
  dial: string;
  /** Os dígitos do número nacional (sem o indicativo): o mínimo e o máximo. */
  min: number;
  max: number;
  /** Como se escrevem em grupos («3 3 3» → 923 000 000). */
  grupos: number[];
  /** Escreve-se normalmente com um zero à frente que não faz parte do número (o «0» francês, alemão…): tira-se. */
  tronco: boolean;
}

// ISO | nome | indicativo | mínimo | máximo | grupos. Sem os números, valem 6 a 12 dígitos em grupos de três.
const TABELA = `AO|Angola|244|9|9|3,3,3
PT|Portugal|351|9|9|3,3,3
BR|Brasil|55|10|11|2,5,4
MZ|Moçambique|258|9|9|2,3,4
CV|Cabo Verde|238|7|7|3,2,2
ST|São Tomé e Príncipe|239|7|7|3,4
GW|Guiné-Bissau|245|7|9|3,3,3
TL|Timor-Leste|670|7|8|4,4
US|Estados Unidos|1|10|10|3,3,4
RU|Rússia|7|10|10|3,3,2,2
AF|Afeganistão|93|9|9|2,3,4
ZA|África do Sul|27|9|9|2,3,4
AL|Albânia|355|8|9|3,3,3
DE|Alemanha|49|10|11|3,4,4
AD|Andorra|376|6|9|3,3,3
AI|Anguilla|1264|7|7|3,4
AG|Antígua e Barbuda|1268|7|7|3,4
SA|Arábia Saudita|966|9|9|2,3,4
DZ|Argélia|213|9|9|3,2,2,2
AR|Argentina|54|10|11|2,4,4
AM|Arménia|374|8|8|2,3,3
AW|Aruba|297|7|7|3,4
AU|Austrália|61|9|9|3,3,3
AT|Áustria|43|10|13|3,4,4
AZ|Azerbaijão|994|9|9|2,3,2,2
BS|Baamas|1242|7|7|3,4
BH|Barém|973|8|8|4,4
BD|Bangladeche|880|10|10|4,6
BB|Barbados|1246|7|7|3,4
BE|Bélgica|32|8|9|3,2,2,2
BZ|Belize|501|7|7|3,4
BJ|Benim|229|8|8|2,2,2,2
BM|Bermudas|1441|7|7|3,4
BY|Bielorrússia|375|9|9|2,3,2,2
BO|Bolívia|591|8|8|4,4
BA|Bósnia e Herzegovina|387|8|8|2,3,3
BW|Botsuana|267|7|8|3,4
BN|Brunei|673|7|7|3,4
BG|Bulgária|359|8|9|3,3,3
BF|Burquina Faso|226|8|8|2,2,2,2
BI|Burúndi|257|8|8|2,2,2,2
BT|Butão|975|8|8|4,4
KH|Camboja|855|8|9|2,3,3
CM|Camarões|237|9|9|3,2,2,2
CA|Canadá|1|10|10|3,3,4
QA|Catar|974|8|8|4,4
KZ|Cazaquistão|7|10|10|3,3,2,2
TD|Chade|235|8|8|2,2,2,2
CZ|Chéquia|420|9|9|3,3,3
CL|Chile|56|9|9|1,4,4
CN|China|86|11|11|3,4,4
CY|Chipre|357|8|8|2,3,3
CO|Colômbia|57|10|10|3,3,4
KM|Comores|269|7|7|3,2,2
CG|Congo|242|9|9|2,3,4
CD|Congo (RD)|243|9|9|3,3,3
KP|Coreia do Norte|850|8|10|3,3,4
KR|Coreia do Sul|82|9|10|2,4,4
CI|Costa do Marfim|225|8|10|2,2,2,2
CR|Costa Rica|506|8|8|4,4
HR|Croácia|385|8|9|2,3,3
CU|Cuba|53|8|8|4,4
CW|Curaçau|599|7|8|3,4
DK|Dinamarca|45|8|8|2,2,2,2
DJ|Jibuti|253|8|8|2,2,2,2
DM|Domínica|1767|7|7|3,4
EG|Egito|20|10|10|3,3,4
SV|El Salvador|503|8|8|4,4
AE|Emirados Árabes Unidos|971|9|9|2,3,4
EC|Equador|593|9|9|2,3,4
ER|Eritreia|291|7|7|3,4
SK|Eslováquia|421|9|9|3,3,3
SI|Eslovénia|386|8|8|2,3,3
ES|Espanha|34|9|9|3,3,3
EE|Estónia|372|7|8|4,4
SZ|Essuatíni|268|8|8|4,4
ET|Etiópia|251|9|9|2,3,4
FJ|Fiji|679|7|7|3,4
PH|Filipinas|63|10|10|3,3,4
FI|Finlândia|358|8|10|2,3,4
FR|França|33|9|9|1,2,2,2,2
GA|Gabão|241|7|8|1,2,2,2
GM|Gâmbia|220|7|7|3,4
GH|Gana|233|9|9|2,3,4
GE|Geórgia|995|9|9|3,3,3
GI|Gibraltar|350|8|8|4,4
GR|Grécia|30|10|10|3,3,4
GD|Granada|1473|7|7|3,4
GL|Gronelândia|299|6|6|2,2,2
GP|Guadalupe|590|9|9|3,3,3
GU|Guame|1671|7|7|3,4
GT|Guatemala|502|8|8|4,4
GY|Guiana|592|7|7|3,4
GF|Guiana Francesa|594|9|9|3,3,3
GN|Guiné|224|9|9|3,2,2,2
GQ|Guiné Equatorial|240|9|9|3,3,3
HT|Haiti|509|8|8|4,4
NL|Países Baixos|31|9|9|1,4,4
HN|Honduras|504|8|8|4,4
HK|Hong Kong|852|8|8|4,4
HU|Hungria|36|8|9|2,3,4
YE|Iémen|967|9|9|3,3,3
KY|Ilhas Caimão|1345|7|7|3,4
CK|Ilhas Cook|682|5|5|2,3
FO|Ilhas Faroé|298|6|6|3,3
FK|Ilhas Falkland|500|5|5|2,3
MH|Ilhas Marshall|692|7|7|3,4
SB|Ilhas Salomão|677|5|7|2,3
TC|Ilhas Turcas e Caicos|1649|7|7|3,4
VG|Ilhas Virgens Britânicas|1284|7|7|3,4
VI|Ilhas Virgens Americanas|1340|7|7|3,4
IN|Índia|91|10|10|5,5
ID|Indonésia|62|9|11|3,4,4
IR|Irão|98|10|10|3,3,4
IQ|Iraque|964|10|10|3,3,4
IE|Irlanda|353|8|9|2,3,4
IS|Islândia|354|7|7|3,4
IL|Israel|972|8|9|2,3,4
IT|Itália|39|9|11|3,3,4
JM|Jamaica|1876|7|7|3,4
JP|Japão|81|9|10|2,4,4
JO|Jordânia|962|8|9|1,4,4
KI|Quiribáti|686|5|8|4,4
XK|Kosovo|383|8|9|2,3,3
KW|Kuwait|965|8|8|4,4
LA|Laos|856|8|10|2,3,3
LS|Lesoto|266|8|8|4,4
LV|Letónia|371|8|8|4,4
LB|Líbano|961|7|8|2,3,3
LR|Libéria|231|7|9|2,3,4
LY|Líbia|218|9|10|2,3,4
LI|Listenstaine|423|7|9|3,3,3
LT|Lituânia|370|8|8|3,5
LU|Luxemburgo|352|8|11|3,3,3
MO|Macau|853|8|8|4,4
MK|Macedónia do Norte|389|8|8|2,3,3
MG|Madagáscar|261|9|10|2,2,3,2
MY|Malásia|60|9|10|2,4,4
MW|Maláui|265|7|9|3,3,3
MV|Maldivas|960|7|7|3,4
ML|Mali|223|8|8|2,2,2,2
MT|Malta|356|8|8|4,4
MA|Marrocos|212|9|9|3,3,3
MQ|Martinica|596|9|9|3,3,3
MU|Maurícia|230|7|8|4,4
MR|Mauritânia|222|8|8|4,4
RE|Reunião e Mayotte|262|9|9|3,3,3
MX|México|52|10|10|3,3,4
MM|Mianmar|95|8|10|3,3,3
FM|Micronésia|691|7|7|3,4
MD|Moldávia|373|8|8|2,3,3
MC|Mónaco|377|8|9|2,3,3
MN|Mongólia|976|8|8|4,4
ME|Montenegro|382|8|8|2,3,3
MS|Monserrate|1664|7|7|3,4
NA|Namíbia|264|8|9|2,3,4
NR|Nauru|674|7|7|3,4
NP|Nepal|977|10|10|3,3,4
NI|Nicarágua|505|8|8|4,4
NE|Níger|227|8|8|2,2,2,2
NG|Nigéria|234|10|10|3,3,4
NO|Noruega|47|8|8|3,2,3
NC|Nova Caledónia|687|6|6|2,2,2
NZ|Nova Zelândia|64|8|10|2,3,4
OM|Omã|968|8|8|4,4
PW|Palau|680|7|7|3,4
PS|Palestina|970|9|9|3,3,3
PA|Panamá|507|7|8|4,4
PG|Papua-Nova Guiné|675|7|8|4,4
PK|Paquistão|92|10|10|3,3,4
PY|Paraguai|595|9|9|3,3,3
PE|Peru|51|9|9|3,3,3
PF|Polinésia Francesa|689|8|8|2,2,2,2
PL|Polónia|48|9|9|3,3,3
PR|Porto Rico|1787|7|7|3,4
KE|Quénia|254|9|9|3,3,3
KG|Quirguistão|996|9|9|3,3,3
GB|Reino Unido|44|10|10|4,6
CF|República Centro-Africana|236|8|8|2,2,2,2
DO|República Dominicana|1809|7|7|3,4
RO|Roménia|40|9|9|3,3,3
RW|Ruanda|250|9|9|3,3,3
WS|Samoa|685|5|7|2,3
SM|São Marinho|378|6|10|3,3,4
PM|São Pedro e Miquelon|508|6|6|2,2,2
LC|Santa Lúcia|1758|7|7|3,4
KN|São Cristóvão e Neves|1869|7|7|3,4
VC|São Vicente e Granadinas|1784|7|7|3,4
SN|Senegal|221|9|9|2,3,2,2
SL|Serra Leoa|232|8|8|2,3,3
RS|Sérvia|381|8|9|2,3,4
SC|Seicheles|248|7|7|1,3,3
SG|Singapura|65|8|8|4,4
SX|São Martinho (parte neerlandesa)|1721|7|7|3,4
SY|Síria|963|9|9|3,3,3
SO|Somália|252|7|9|2,3,4
LK|Sri Lanca|94|9|9|2,3,4
SD|Sudão|249|9|9|2,3,4
SS|Sudão do Sul|211|9|9|3,3,3
SE|Suécia|46|7|9|2,3,4
CH|Suíça|41|9|9|2,3,2,2
SR|Suriname|597|6|7|3,4
TJ|Tajiquistão|992|9|9|3,3,3
TH|Tailândia|66|9|9|2,3,4
TW|Taiwan|886|9|9|3,3,3
TZ|Tanzânia|255|9|9|3,3,3
TG|Togo|228|8|8|2,2,2,2
TO|Tonga|676|5|7|2,3
TT|Trinidad e Tobago|1868|7|7|3,4
TN|Tunísia|216|8|8|2,3,3
TM|Turquemenistão|993|8|8|2,3,3
TR|Turquia|90|10|10|3,3,4
TV|Tuvalu|688|5|6|2,3
UA|Ucrânia|380|9|9|2,3,2,2
UG|Uganda|256|9|9|3,3,3
UY|Uruguai|598|8|9|2,3,3
UZ|Usbequistão|998|9|9|2,3,2,2
VU|Vanuatu|678|5|7|2,3
VA|Vaticano|379|6|10|3,3,4
VE|Venezuela|58|10|10|3,3,4
VN|Vietname|84|9|10|2,3,4
ZM|Zâmbia|260|9|9|2,3,4
ZW|Zimbabué|263|9|9|2,3,4`;

/** Os países onde o número nacional costuma escrever-se com um zero à frente (que sai quando se liga do estrangeiro). */
const COM_TRONCO = new Set("FR DE GB BR NL BE CH AT ZA KE NG GH TZ UG AU NZ JP IN MA DZ TN EG SA AE IL JO LB PK BD ID MY TH VN KR TR IE ZW ZM SN CI".split(" "));

/** Os países mais usados neste painel: ficam no topo da lista. */
export const PAISES_FREQUENTES = ["AO", "PT", "BR", "MZ", "CV", "ST", "GW", "TL"];

export const PAISES: PaisTelefone[] = TABELA.split("\n").map((linha) => {
  const [iso, nome, dial, min, max, grupos] = linha.split("|");
  const lim = Math.min(15 - dial.length, 12);
  const minimo = min ? Number(min) : 6;
  return { iso, nome, dial, min: minimo, max: max ? Number(max) : Math.max(minimo, lim), grupos: grupos ? grupos.split(",").map(Number) : [3, 3, 3, 3], tronco: COM_TRONCO.has(iso) };
});

export const paisPorIso = (iso: string): PaisTelefone | undefined => PAISES.find((p) => p.iso === iso.toUpperCase());

/** O indicativo para mostrar: «+244», ou «+1 242» nos países da América do Norte com código de zona. */
export const indicativoDe = (p: PaisTelefone): string => (p.dial.length === 4 && p.dial.startsWith("1") ? `+1 ${p.dial.slice(1)}` : `+${p.dial}`);

/** O país onde a pessoa provavelmente está, pelo fuso horário da conta (para o indicativo já vir escolhido). */
export function paisPorFuso(fuso: string): PaisTelefone {
  const iso = fuso === "Europe/Lisbon" ? "PT" : fuso === "Africa/Maputo" ? "MZ" : "AO";
  return paisPorIso(iso)!;
}

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Pesquisa na lista: pelo nome do país, pelo código de duas letras ou pelo indicativo («244», «+351»). Sem texto, todos (os mais usados primeiro). */
export function pesquisarPaises(texto: string): PaisTelefone[] {
  const q = sem(texto.trim());
  const todos = [...PAISES_FREQUENTES.map((i) => paisPorIso(i)!), ...PAISES.filter((p) => !PAISES_FREQUENTES.includes(p.iso)).sort((a, b) => a.nome.localeCompare(b.nome, "pt"))];
  if (!q) return todos;
  const digitos = q.replace(/\D/g, "");
  const porIndicativo = q.startsWith("+") || /^\d+$/.test(q);
  return todos.filter((p) => sem(p.nome).includes(q) || sem(p.iso) === q || (porIndicativo && digitos !== "" && p.dial.startsWith(digitos)));
}

// ---------- reconhecer e limpar ----------

/** O número começa por «+» ou «00» e o que vem a seguir é o indicativo de um país? Escolhe o indicativo mais longo («+1242» é as Baamas, «+1» os Estados Unidos). */
export function reconhecerPais(texto: string): { pais: PaisTelefone; resto: string } | null {
  const t = texto.trim();
  if (!t.startsWith("+") && !t.startsWith("00")) return null;
  const digitos = t.replace(/\D/g, "").replace(/^00/, t.startsWith("+") ? "00" : "");
  let melhor: PaisTelefone | null = null;
  for (const p of PAISES) if (digitos.startsWith(p.dial) && (!melhor || p.dial.length > melhor.dial.length)) melhor = p;
  return melhor ? { pais: melhor, resto: digitos.slice(melhor.dial.length) } : null;
}

/** Só os dígitos do número nacional: sem o zero do «tronco» e até ao máximo do país. */
export function limparCorpoDoTelefone(texto: string, pais: PaisTelefone): string {
  let d = texto.replace(/\D/g, "");
  if (pais.tronco) d = d.replace(/^0+/, "");
  return d.slice(0, pais.max);
}

/**
 * O que a pessoa escreveu ou colou no campo, e o país onde está escolhido: com «+» ou «00» à frente o indicativo é reconhecido e o país muda sozinho;
 * sem ele, o número fica no país escolhido (e se colou o número inteiro com o indicativo desse país, sem o «+», o indicativo sai).
 */
export function escreverTelefone(texto: string, atual: PaisTelefone): { pais: PaisTelefone; corpo: string } {
  const t = texto.trim();
  const r = reconhecerPais(t);
  if (r) return { pais: r.pais, corpo: limparCorpoDoTelefone(r.resto, r.pais) };
  const digitos = t.replace(/\D/g, "");
  if (digitos.startsWith(atual.dial) && digitos.length > atual.max) return { pais: atual, corpo: limparCorpoDoTelefone(digitos.slice(atual.dial.length), atual) };
  return { pais: atual, corpo: limparCorpoDoTelefone(digitos, atual) };
}

/** O número nacional em grupos, para ler: «923 000 000». */
export function formatarCorpoDoTelefone(corpo: string, pais: PaisTelefone): string {
  const partes: string[] = [];
  let i = 0;
  for (let g = 0; i < corpo.length; g++) {
    const n = pais.grupos[g] ?? 3;
    partes.push(corpo.slice(i, i + n));
    i += n;
  }
  return partes.join(" ");
}

/** O número completo, como se guarda: «+244 923 000 000»; vazio se ainda não há dígitos. */
export const telefoneDe = (pais: PaisTelefone, corpo: string): string => (corpo ? `${indicativoDe(pais)} ${formatarCorpoDoTelefone(corpo, pais)}` : "");

/** Lê um número guardado («+244 923 000 000», «923000000», «00351912345678»): o país e o número nacional. Sem indicativo, vale o país por omissão. */
export function lerTelefone(guardado: string, porOmissao: PaisTelefone): { pais: PaisTelefone; corpo: string } {
  return escreverTelefone(guardado, porOmissao);
}

/** Um exemplo de número do país, para o campo vazio. */
export function exemploDeTelefone(pais: PaisTelefone): string {
  const exemplos: Record<string, string> = { AO: "923000000", PT: "912345678", BR: "11912345678", MZ: "841234567", CV: "9912345", ST: "9912345", GW: "955123456" };
  return formatarCorpoDoTelefone(exemplos[pais.iso] ?? "123456789012".slice(0, pais.min), pais);
}

/** Mensagem de erro para o número nacional escrito, ou null se serve (vazio não é erro: é um campo por preencher). */
export function erroDoTelefone(pais: PaisTelefone, corpo: string): string | null {
  if (corpo.length === 0) return null;
  if (corpo.length >= pais.min) return null;
  const faltam = pais.min - corpo.length;
  return `Faltam ${pais.min === pais.max ? "" : "pelo menos "}${faltam} ${faltam === 1 ? "dígito" : "dígitos"}.`;
}
