(function(){
  const API_BASE = 'https://projetofinalapi-3tv9.onrender.com';
  let bebidasByBrand = {}; // { 'Coca-Cola': {id, price, name}, 'Pepsi': {...} }
  let selectedBrand = null;
  let selectedBeverageId = null;
  let total = 0;

  const cocaItem = document.querySelector('.coca');
  const pepsiItem = document.querySelector('.pepsi');
  const pedidoLinks = document.querySelectorAll('.pedido');
  const pagarBtn = document.querySelector('.pagar a');
  const totalEl = document.querySelector('.valor');

  function formatBRL(value){
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async function fetchBebidas(){
    try {
      const res = await fetch(`${API_BASE}/bebidas`);
      if(!res.ok) throw new Error(`Erro ao buscar bebidas: ${res.status}`);
      const list = await res.json();
      bebidasByBrand = {};
      list.forEach(b => {
        bebidasByBrand[b.brand] = { id: b.id || b._id || b.guid || b.uuid || b._id, price: b.price, name: b.name };
      });
      // Atualiza preços no DOM se disponíveis
      if(bebidasByBrand['Coca-Cola'] && cocaItem){
        const precoSpan = cocaItem.querySelector('.preco');
        if(precoSpan){ precoSpan.textContent = `${formatBRL(bebidasByBrand['Coca-Cola'].price)}`; }
      }
      if(bebidasByBrand['Pepsi'] && pepsiItem){
        const precoSpan = pepsiItem.querySelector('.preco');
        if(precoSpan){ precoSpan.textContent = `${formatBRL(bebidasByBrand['Pepsi'].price)}`; }
      }
    } catch(err){
      console.error(err);
    }
  }

  function updateTotal(){
    if(totalEl){
      totalEl.textContent = `Valor Total: ${formatBRL(total)}`;
    }
  }

  // Seleção dos itens clicando em .pedido (inferir pela proximidade do texto)
  pedidoLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const brandNode = link.querySelector('.coca span, .pepsi span');
      const brandText = brandNode ? brandNode.textContent.trim() : '';
      // Normaliza nomes para marcas conhecidas
      let brand = null;
      if(brandText.toLowerCase().includes('coca')) brand = 'Coca-Cola';
      else if(brandText.toLowerCase().includes('pepsi')) brand = 'Pepsi';

      if(!brand){
        alert('Não foi possível identificar a bebida.');
        return;
      }
      selectedBrand = brand;
      const info = bebidasByBrand[brand];
      selectedBeverageId = info ? info.id : null;
      total = info ? (info.price || 0) : total;
      updateTotal();
      // feedback simples
      link.classList.add('selecionado');
      setTimeout(() => link.classList.remove('selecionado'), 500);
    });
  });

  // Pagar → cria comando para ESP32 via API e reduz estoque
  pagarBtn && pagarBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if(!selectedBeverageId){
      alert('Selecione uma bebida antes de pagar.');
      return;
    }
    try {
      // 1) Cria comando para ESP32
      const res = await fetch(`${API_BASE}/bebidas/${encodeURIComponent(selectedBeverageId)}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'frontend', brand: selectedBrand })
      });
      if(!(res.status === 200 || res.status === 201)){
        const txt = await res.text();
        alert(`Erro ao confirmar pagamento: ${res.status}\n${txt}`);
        return;
      }
      const data = await res.json();
      console.log('Comando criado:', data);

      // 2) Reduz estoque: POST /bebidas/:id/decrease?amount=1
      const dec = await fetch(`${API_BASE}/bebidas/${encodeURIComponent(selectedBeverageId)}/decrease?amount=1`, {
        method: 'POST'
      });
      if(!(dec.status === 200 || dec.status === 201)){
        const txt = await dec.text();
        alert(`Comando criado, mas falhou reduzir estoque: ${dec.status}\n${txt}`);
        return;
      }

      alert('Pagamento confirmado! Comando enviado e estoque atualizado.');
      // Zera total após pagar
      total = 0; updateTotal(); selectedBrand = null; selectedBeverageId = null;
    } catch(err){
      console.error(err);
      alert('Falha na comunicação com a API.');
    }
  });

  // Inicializa
  fetchBebidas().then(() => {
    updateTotal();
  });
})();
