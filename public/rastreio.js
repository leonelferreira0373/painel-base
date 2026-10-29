/* Rastreio do painel: regista as visitas (de onde vieram, que páginas viram) e os cliques em botões e ligações, e envia-os para o endereço de eventos (contrato POST /v1/eventos). Sem cookies de terceiros: o identificador do visitante fica no localStorage e o da sessão no sessionStorage.
   Uso: <script defer src="https://painel.exemplo.pt/rastreio.js" data-endpoint="https://api.exemplo.pt/v1/eventos"></script>
   Para dar um nome a um botão: <button data-rastreio="Pedir proposta">. */
(function () {
  var script = document.currentScript;
  var endpoint = script && script.getAttribute("data-endpoint");
  if (!endpoint) return;

  function id(chave, armazem, prefixo) {
    try {
      var v = armazem.getItem(chave);
      if (!v) {
        v = prefixo + "-" + Math.random().toString(36).slice(2, 10);
        armazem.setItem(chave, v);
      }
      return v;
    } catch (e) {
      return prefixo + "-anonimo";
    }
  }
  var visitante = id("painel.visitante", window.localStorage, "v");
  var sessao = id("painel.sessao", window.sessionStorage, "s");

  function utm() {
    var p = new URLSearchParams(window.location.search);
    var u = {};
    ["source", "medium", "campaign", "term", "content"].forEach(function (k) {
      var v = p.get("utm_" + k);
      if (v) u[k] = v;
    });
    return Object.keys(u).length ? u : undefined;
  }

  function enviar(evento) {
    evento.visitante = visitante;
    evento.sessao = sessao;
    evento.pagina = window.location.pathname;
    evento.quando = new Date().toISOString();
    var corpo = JSON.stringify(evento);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(endpoint, new Blob([corpo], { type: "application/json" }))) return;
    } catch (e) {}
    try {
      fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: corpo, keepalive: true });
    } catch (e) {}
  }

  var ultima = "";
  function visita() {
    var caminho = window.location.pathname + window.location.search;
    if (caminho === ultima) return;
    ultima = caminho;
    enviar({ tipo: "visita", referrer: document.referrer || "", utm: utm() });
  }
  visita();
  ["pushState", "replaceState"].forEach(function (m) {
    var original = history[m];
    history[m] = function () {
      var r = original.apply(this, arguments);
      setTimeout(visita, 0);
      return r;
    };
  });
  window.addEventListener("popstate", function () {
    setTimeout(visita, 0);
  });

  document.addEventListener(
    "click",
    function (e) {
      var alvo = e.target && e.target.closest ? e.target.closest("[data-rastreio], button, a, [role=button]") : null;
      if (!alvo) return;
      var nome = alvo.getAttribute("data-rastreio") || (alvo.getAttribute("aria-label") || alvo.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
      if (!nome) return;
      enviar({ tipo: "clique", elemento: nome });
    },
    true,
  );
})();
