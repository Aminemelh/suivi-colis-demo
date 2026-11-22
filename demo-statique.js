/*
 * Version démo SANS serveur (pour GitHub Pages).
 * Remplace les appels à server.py (/api/...) par :
 *   - 500 résidents et 12 mois de livraisons inventés (mêmes à chaque visite)
 *   - la salle gestionnaire enregistrée dans ce navigateur seulement (localStorage)
 * Aucune donnée réelle, aucune clé API. Les photos d'étiquettes sont lues dans le navigateur.
 */
(function(){
  const DAY = 86400000;
  function prng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const PRENOMS = ["Marie","Jean","Sophie","Karim","Lucie","Marc","Nadia","Pierre","Julie","Ahmed","Olivier","Emma","Louis","Camille",
    "Gabriel","Léa","Samuel","Chloé","Thomas","Alice","William","Rosalie","Nathan","Florence","Félix","Juliette","Antoine","Zoé",
    "Mohamed","Inès","David","Sarah","Alexandre","Laura","Hugo","Maya","Vincent","Amira","Mathieu","Charlotte","Daniel","Yasmine",
    "Simon","Clara","Omar","Élodie","Raphaël","Noémie","Adam","Victoria","Liam","Ana","Wei","Priya","Diego","Fatima"];
  const NOMS = ["Tremblay","Gagnon","Roy","Côté","Bouchard","Gauthier","Morin","Lavoie","Fortin","Gagné","Ouellet","Pelletier",
    "Bélanger","Lévesque","Bergeron","Leblanc","Paquette","Girard","Simard","Boucher","Caron","Beaulieu","Cloutier","Dubé","Poirier",
    "Fournier","Lapointe","Leclerc","Lefebvre","Poulin","Thibault","Benali","Haddad","Mansour","Nguyen","Chen","Martinez","Rossi",
    "Kowalski","Singh","Diallo","Cohen","Silva","Papadopoulos","Hassan","Petit","Mercier","Dufour","Bernier","Charbonneau"];

  function residents(){
    const rnd = prng(500), pris = new Set(), out = [];
    const unites = []; for(let e = 2; e <= 30; e++) for(let p = 1; p <= 20; p++) unites.push(e + String(p).padStart(2, '0'));
    for(let i = unites.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [unites[i], unites[j]] = [unites[j], unites[i]]; }
    while(out.length < 500){
      const p = PRENOMS[Math.floor(rnd() * PRENOMS.length)], n = NOMS[Math.floor(rnd() * NOMS.length)];
      if(pris.has(p + n)) continue; pris.add(p + n); out.push([p, n, unites.pop()]);
    }
    return out;
  }
  function colis(){
    const rnd = prng(7), now = Date.now(), out = []; let id = 1;
    for(const [p, n, app] of residents()){
      const x = rnd(), profil = x < .35 ? .3 + rnd() * 1.5 : x < .8 ? 2.2 + rnd() * 4.3 : 7.5 + rnd() * 16.5;
      const nb = [1,2,3,4,5,6,8,10,12,15,18,24][Math.floor(rnd() * 12)];
      for(let k = 0; k < nb; k++){
        const dep = now - (0.5 + rnd() * 364.5) * DAY, age = (now - dep) / DAY;
        let delai = profil * (0.5 + rnd()) * (1 + age / 365 * 0.6), agent = delai > 30;
        if(agent) delai = 30 + rnd() * 2;
        const rec = dep + delai * DAY, fini = rec < now;
        out.push({id:'r' + id++, resident:p + ' ' + n, appart:app, casier:'', suivi:'TBA' + (312000000000 + id),
          depot:new Date(dep).toISOString(), recup:fini ? new Date(rec).toISOString() : null, retire_par_agent:fini && agent});
      }
    }
    out.push({id:'r900', resident:'Karim Benali', appart:'204', casier:'', suivi:'CA999001',
      depot:new Date(now - 41 * DAY).toISOString(), recup:null, retire_par_agent:false});
    // 60 casiers : au plus 48 colis en attente, chacun dans son casier
    out.filter(c => !c.recup).sort((a,b) => a.depot < b.depot ? -1 : 1).forEach((c, j) => {
      if(j < 48) c.casier = 'B' + (j + 1); else c.recup = new Date(now).toISOString();
    });
    out.forEach(c => { if(!c.casier) c.casier = 'B' + (1 + Math.floor(rnd() * 60)); });
    return out;
  }

  /* ----- Salle gestionnaire : gardée dans ce navigateur ----- */
  const KEY = 'salle-demo', AKEY = 'adresse-demo';
  const get = (k, d) => { try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } };
  const set = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} };

  let cache = null;
  const repondre = (data, status = 200) => Promise.resolve(new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json'}}));
  const vraiFetch = window.fetch.bind(window);
  window.fetch = (url, opt = {}) => {
    const u = String(url);
    if(u.includes('/api/colis')){
      cache ??= colis();
      return repondre({colis:cache, casiers_total:60, rappel_jours:30, demo:true, envoi_auto:{actif:false}});
    }
    if(u.endsWith('/api/salle') && (!opt.method || opt.method === 'GET'))
      return repondre({colis:get(KEY, []), residents:residents().map(([p, n, a]) => ({nom:p + ' ' + n, appart:a})), adresse:get(AKEY, '')});
    if(u.endsWith('/api/salle')){
      const d = JSON.parse(opt.body || '{}');
      if(!(d.nom || '').trim() && !(d.appart || '').trim()) return repondre({erreur:'Indiquez au moins le nom ou l\'appartement.'}, 400);
      const item = {id:'s' + Date.now(), nom:(d.nom || '').trim(), appart:(d.appart || '').trim(), transporteur:d.transporteur || '',
        suivi:(d.suivi || '').trim(), note:(d.note || '').trim(), ajoute_le:new Date().toISOString(), recupere_le:null};
      set(KEY, [...get(KEY, []), item]); return repondre(item);
    }
    const m = u.match(/\/api\/salle\/(.+)$/);
    if(m){
      const d = JSON.parse(opt.body || '{}'); let items = get(KEY, []);
      if(d.supprimer) items = items.filter(i => i.id !== m[1]);
      else items.forEach(i => { if(i.id === m[1]) i.recupere_le = d.recupere ? new Date().toISOString() : null; });
      set(KEY, items); return repondre({colis:items});
    }
    return vraiFetch(url, opt);
  };

  /* ----- Champ « adresse à vérifier » (gardée sur cet appareil seulement) ----- */
  addEventListener('DOMContentLoaded', () => {
    const zone = document.getElementById('checks'); if(!zone) return;
    zone.insertAdjacentHTML('beforebegin', `<div class="field"><label for="demoAdr">Adresse de l'immeuble à vérifier (démo, gardée sur cet appareil)</label>
      <input id="demoAdr" placeholder="Ex. 1000 rue de l'Exemple" value="${String(get(AKEY, '')).replace(/"/g, '&quot;')}"></div>`);
    document.getElementById('demoAdr').addEventListener('change', e => {
      set(AKEY, e.target.value.trim());
      if(typeof adresse !== 'undefined') adresse = e.target.value.trim();
    });
  });
})();
