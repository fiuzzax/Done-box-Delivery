/* =================================================================
   CONFIGURAÇÕES GERAIS
================================================================= */
const NUMERO_WHATSAPP = "5585991799798"; 
const TAXA_ENTREGA = 5.00; 

let carrinho = [];
let produtoAtual = {}; 
let filaIngredientes = []; 
let tipoEntrega = 'entrega'; 

// --- INICIALIZAÇÃO ---
carregarCarrinho(); 
verificarStatusLoja();

/* =================================================================
   1. CEP INTELIGENTE
================================================================= */
const cepInput = document.getElementById('end-cep');
if(cepInput) {
    cepInput.addEventListener('blur', buscarCep); 
    cepInput.addEventListener('input', (e) => { 
        let valor = e.target.value.replace(/\D/g, '');
        if(valor.length === 8) buscarCep();
    });
}

async function buscarCep() {
    const cep = cepInput.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    showToast("Buscando endereço...", "aviso");
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (data.erro) { showToast("CEP não encontrado!", "erro"); return; }
        document.getElementById('end-rua').value = data.logradouro;
        document.getElementById('end-bairro').value = data.bairro;
        document.getElementById('end-numero').focus();
        showToast("Endereço encontrado!", "sucesso");
    } catch (error) { showToast("Erro ao buscar CEP.", "erro"); }
}

/* =================================================================
   2. SISTEMA TOAST E VALIDAÇÃO
================================================================= */
function showToast(msg, tipo='padrao') {
    const toast = document.getElementById("toast-container");
    if(!toast) return;
    toast.innerText = msg;
    toast.className = "show " + tipo;
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

document.querySelectorAll('input').forEach(input => input.addEventListener('input', () => input.classList.remove('input-erro')));
function marcarErro(el) { if(el) { el.classList.add('input-erro'); el.addEventListener('input', function() { this.classList.remove('input-erro'); }, {once:true}); } }

/* =================================================================
   3. STATUS E SWIPE
================================================================= */
function verificarStatusLoja() {
    const data = new Date();
    const dia = data.getDay(); 
    const hora = data.getHours();
    const diasAbertos = [4, 5, 6]; 
    const aberto = diasAbertos.includes(dia) && (hora >= 19 && hora < 23);
    const btn = document.getElementById('btn-status');
    if(btn) { if (aberto) { btn.innerText = "Aberto ▾"; btn.classList.remove('fechado'); btn.classList.add('aberto'); } 
    else { btn.innerText = "Fechado ▾"; btn.classList.remove('aberto'); btn.classList.add('fechado'); } }
}

function aplicarSwipe(idContent, funcFechar) {
    const content = document.getElementById(idContent);
    let startY=0, currentY=0, isDragging=false;
    if (!content) return;

    content.addEventListener('touchstart', (e) => {
        const target = e.target;
        const isHeader = target.closest('.modal-header') || target.closest('.modal-header-clean') || target.classList.contains('modal-drag-bar');
        if (!isHeader) { isDragging = false; return; }
        if (content.scrollTop === 0) { startY = e.touches[0].clientY; isDragging = true; content.style.transition = 'none'; }
    }, {passive: false});

    content.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const y = e.touches[0].clientY;
        const deltaY = y - startY;
        if (deltaY > 0) { if(e.cancelable) e.preventDefault(); currentY = deltaY; content.style.transform = `translateY(${currentY}px)`; }
    }, {passive: false});

    content.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        if (currentY > 100) { content.style.transition = 'transform 0.2s ease-out'; content.style.transform = 'translateY(100vh)'; setTimeout(() => { funcFechar(); currentY = 0; }, 200); } 
        else { content.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'; content.style.transform = 'translateY(0)'; currentY = 0; }
    });
}
aplicarSwipe('modal-horarios-content', fecharModalHorarios);
aplicarSwipe('modal-carrinho-content', fecharCarrinho);

/* =================================================================
   4. MODAIS
================================================================= */
function abrirModalHorarios() { document.getElementById('modal-horarios').style.display = 'flex'; setTimeout(()=>document.getElementById('modal-horarios-content').style.transform='translateY(0)',10); }
function fecharModalHorarios() { document.getElementById('modal-horarios').style.display = 'none'; }
function abrirCarrinho() { renderizarCarrinho(); document.getElementById('modal-carrinho').style.display = 'flex'; setTimeout(()=>document.getElementById('modal-carrinho-content').style.transform='translateY(0)',10); }
function fecharCarrinho() { document.getElementById('modal-carrinho').style.display = 'none'; }
function fecharEntrega() { document.getElementById('modal-entrega').style.display = 'none'; }
window.onclick = function(event) { if (event.target.classList.contains('modal-overlay')) event.target.style.display = 'none'; }

/* =================================================================
   5. PRODUTOS (BEBIDA VS MASSA)
================================================================= */
const modalProduto = document.getElementById('modal-produto');
document.querySelectorAll('.produto-item').forEach(item => {
    item.addEventListener('click', () => {
        const nome = item.querySelector('h3').innerText;
        const preco = parseFloat(item.querySelector('.preco').innerText.replace('R$', '').replace(',', '.'));
        // Pega a categoria do HTML (massa ou bebida)
        const categoria = item.getAttribute('data-categoria') || 'massa';
        abrirModalProduto(nome, preco, categoria);
    });
});

function abrirModalProduto(nome, precoBase, categoria) {
    limparModal();
    produtoAtual = { nome, precoBase, precoTotalItem: precoBase, extras: 0, categoria: categoria };
    document.querySelector('.modal-titulo').innerText = `Adicionar: ${nome}`;
    
    // LÓGICA MÁGICA: Se for bebida, esconde as opções de montagem!
    const areaMontagem = document.getElementById('secoes-montagem');
    if(categoria === 'bebida') {
        areaMontagem.classList.add('oculto');
    } else {
        areaMontagem.classList.remove('oculto');
    }

    atualizarBotaoPreco();
    modalProduto.style.display = 'flex';
}
document.querySelector('.modal-close').addEventListener('click', () => modalProduto.style.display = 'none');

// Lógica Ingredientes
document.querySelectorAll('input[name="ingrediente"]').forEach(check => {
    check.addEventListener('change', (e) => {
        const val = e.target.value;
        if (check.checked) filaIngredientes.push(val); else filaIngredientes = filaIngredientes.filter(i => i !== val);
        document.querySelectorAll('input[name="ingrediente"]').forEach(inp => { inp.parentElement.classList.remove('item-extra'); if(inp.parentElement.querySelector('.badge-extra')) inp.parentElement.querySelector('.badge-extra').remove(); });
        filaIngredientes.forEach((v, k) => { if (k >= 4) { const el = document.querySelector(`input[value="${v}"]`).parentElement; el.classList.add('item-extra'); if(!el.querySelector('.badge-extra')) { const s = document.createElement('span'); s.className='badge-extra'; s.innerText='+ R$ 2,00'; el.appendChild(s); } } });
        const extras = Math.max(0, filaIngredientes.length - 4);
        produtoAtual.extras = extras;
        produtoAtual.precoTotalItem = produtoAtual.precoBase + (extras * 2.00);
        atualizarBotaoPreco();
    });
});

// Lógica Molho
document.querySelectorAll('input[name="molho"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        document.querySelectorAll('.select-qtd').forEach(s => s.disabled = true);
        const selectVizinho = e.target.parentElement.nextElementSibling;
        if(selectVizinho) selectVizinho.disabled = false;
    });
});

function atualizarBotaoPreco() {
    const btn = document.querySelector('#btn-adicionar-carrinho'); 
    if(btn) btn.innerText = `Adicionar • R$ ${produtoAtual.precoTotalItem.toFixed(2).replace('.', ',')}`;
}

// BOTÃO ADICIONAR AO CARRINHO (COM LÓGICA DE BEBIDA)
const btnAddProduto = document.querySelector('#btn-adicionar-carrinho');
if(btnAddProduto) {
    btnAddProduto.addEventListener('click', () => {
        // Se for massa, valida os campos obrigatórios
        if(produtoAtual.categoria !== 'bebida') {
            const massa = document.querySelector('input[name="massa"]:checked');
            const molhoRadio = document.querySelector('input[name="molho"]:checked');
            
            if (!massa) { showToast("Escolha uma Massa!", "aviso"); return; }
            if (!molhoRadio) { showToast("Escolha um Molho!", "aviso"); return; }

            const selectQtd = molhoRadio.parentElement.nextElementSibling;
            const molhoQtd = selectQtd ? selectQtd.value : 'Normal';
            produtoAtual.massa = massa.value;
            produtoAtual.molho = `${molhoRadio.value} (${molhoQtd})`;
            produtoAtual.ingredientes = Array.from(document.querySelectorAll('input[name="ingrediente"]:checked')).map(i => i.value);
        } else {
            // Se for bebida, define valores padrão
            produtoAtual.massa = '-';
            produtoAtual.molho = '-';
            produtoAtual.ingredientes = [];
        }

        produtoAtual.obs = document.querySelector('textarea').value;
        carrinho.push({ ...produtoAtual });
        
        salvarCarrinho();
        atualizarBarra();
        modalProduto.style.display = 'none';
        showToast("Item adicionado!", "sucesso");
    });
}

/* =================================================================
   6. CARRINHO
================================================================= */
document.querySelector('.btn-ver-pedido').addEventListener('click', abrirCarrinho);

function renderizarCarrinho() {
    const container = document.getElementById('lista-itens-carrinho');
    const totalEl = document.getElementById('total-carrinho-modal');
    container.innerHTML = '';
    if (carrinho.length === 0) {
        container.innerHTML = `<div class="carrinho-vazio"><i class="fas fa-shopping-basket"></i><p>Vazio...</p></div>`;
        totalEl.innerText = 'R$ 0,00';
    } else {
        let total = 0;
        carrinho.forEach((item, i) => {
            total += item.precoTotalItem;
            
            // Descrição diferente para Bebida
            let desc = '';
            if(item.categoria === 'bebida') {
                desc = 'Bebida Gelada';
            } else {
                desc = `${item.massa}, ${item.molho}`;
                if(item.ingredientes.length) desc += `<br>+ ${item.ingredientes.join(', ')}`;
                if(item.extras) desc += `<br><span style="color:#e67e22">(${item.extras}x Extras)</span>`;
            }

            container.innerHTML += `
                <div class="item-carrinho">
                    <div class="info-item"><h4>${item.nome}</h4><p>${desc}</p>${item.obs ? `<p class="obs-item">Obs: ${item.obs}</p>` : ''}</div>
                    <div class="preco-remove"><span class="preco-item">R$ ${item.precoTotalItem.toFixed(2).replace('.', ',')}</span>
                    <button class="btn-remove" onclick="removerItem(${i})"><i class="fas fa-trash"></i></button></div>
                </div>`;
        });
        totalEl.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }
}

function removerItem(i) { carrinho.splice(i, 1); salvarCarrinho(); renderizarCarrinho(); atualizarBarra(); showToast("Item removido", "aviso"); }
function atualizarBarra() {
    const b = document.querySelector('.carrinho-bar');
    if(carrinho.length > 0) {
        const t = carrinho.reduce((a, i) => a + i.precoTotalItem, 0);
        b.style.display = 'flex';
        document.getElementById('itens-carrinho').innerText = `${carrinho.length} item(s)`;
        document.querySelector('.carrinho-total span').innerText = `Total: R$ ${t.toFixed(2).replace('.', ',')}`;
    } else { b.style.display = 'none'; }
}
function salvarCarrinho() { try { localStorage.setItem('donebox_carrinho', JSON.stringify(carrinho)); } catch (e) {} }
function carregarCarrinho() { try { const salvo = localStorage.getItem('donebox_carrinho'); if (salvo) { carrinho = JSON.parse(salvo); if (!Array.isArray(carrinho)) carrinho = []; atualizarBarra(); } } catch (e) { carrinho = []; salvarCarrinho(); } }

/* =================================================================
   7. ENTREGA (SEM SWIPE) E ZAP (COMANDA ADAPTADA)
================================================================= */
function irParaEntrega() {
    if (carrinho.length === 0) { showToast("Carrinho vazio!", "erro"); return; }
    fecharCarrinho(); atualizarResumoValores();
    document.getElementById('modal-entrega').style.display = 'flex';
    setTimeout(()=>document.getElementById('modal-entrega-content').style.transform='translateY(0)',10);
}
function mudarTab(tipo) {
    tipoEntrega = tipo;
    const btnE = document.getElementById('tab-entrega');
    const btnR = document.getElementById('tab-retirada');
    const areaEnd = document.getElementById('area-endereco');
    const areaRet = document.getElementById('area-retirada');
    if (tipo === 'entrega') { btnE.classList.add('active'); btnR.classList.remove('active'); areaEnd.style.display = 'block'; areaRet.style.display = 'none'; } 
    else { btnR.classList.add('active'); btnE.classList.remove('active'); areaEnd.style.display = 'none'; areaRet.style.display = 'block'; }
    atualizarResumoValores();
}
function atualizarResumoValores() {
    const subtotal = carrinho.reduce((acc, item) => acc + item.precoTotalItem, 0);
    let totalFinal = subtotal;
    const linhaTaxa = document.getElementById('linha-taxa');
    if (tipoEntrega === 'entrega') { totalFinal += TAXA_ENTREGA; if(linhaTaxa) linhaTaxa.classList.remove('oculto'); } 
    else { if(linhaTaxa) linhaTaxa.classList.add('oculto'); }
    document.getElementById('resumo-subtotal').innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('resumo-total').innerText = `R$ ${totalFinal.toFixed(2).replace('.', ',')}`;
}
function toggleTroco(show) { document.getElementById('area-troco').style.display = show ? 'block' : 'none'; }
function copierEndereco() { navigator.clipboard.writeText("Rua José Carlos Gurgel Nogueira, 154 - Vicente Pinzón, Fortaleza/CE").then(() => { showToast("Endereço copiado!", "sucesso"); }); }

function finalizarPedidoZap() {
    let erros = 0, primeiroErro = null;
    const nomeInput = document.getElementById('cliente-nome');
    const pagInput = document.querySelector('input[name="pagamento"]:checked');
    const containerPag = document.querySelector('.pagamento-opcoes');

    if (!nomeInput.value.trim()) { marcarErro(nomeInput); erros++; if(!primeiroErro) primeiroErro = nomeInput; }
    if (tipoEntrega === 'entrega') {
        const rua = document.getElementById('end-rua'); const num = document.getElementById('end-numero'); const bairro = document.getElementById('end-bairro');
        if (!rua.value.trim()) { marcarErro(rua); erros++; if(!primeiroErro) primeiroErro = rua; }
        if (!num.value.trim()) { marcarErro(num); erros++; if(!primeiroErro) primeiroErro = num; }
        if (!bairro.value.trim()) { marcarErro(bairro); erros++; if(!primeiroErro) primeiroErro = bairro; }
    }
    if (!pagInput) {
        containerPag.style.border = "1px solid #e74c3c"; containerPag.style.padding = "5px"; containerPag.style.borderRadius = "8px"; erros++; if(!primeiroErro) primeiroErro = containerPag;
        document.querySelectorAll('input[name="pagamento"]').forEach(el => { el.addEventListener('change', () => { containerPag.style.border = "none"; }); });
    }

    if (erros > 0) { showToast(`Faltam ${erros} informações!`, "erro"); if(primeiroErro) { primeiroErro.scrollIntoView({behavior: 'smooth', block: 'center'}); if(primeiroErro.tagName === 'INPUT') primeiroErro.focus(); } return; }

    const subtotal = carrinho.reduce((acc, item) => acc + item.precoTotalItem, 0);
    const taxa = tipoEntrega === 'entrega' ? TAXA_ENTREGA : 0;
    const totalFinal = subtotal + taxa;
    const agora = new Date();
    const dataHora = agora.toLocaleDateString() + ' - ' + agora.toLocaleTimeString().slice(0,5);

    let msg = `DONE BOX - Massas e Delivery\nData: ${dataHora}\n--------------------------------\n\n`;
    msg += `CLIENTE:\n${nomeInput.value}\n\nRESUMO DO PEDIDO:\n`;

    carrinho.forEach((item, i) => {
        msg += `\nITEM ${i+1}: ${item.nome}\n`;
        
        // SÓ MOSTRA DETALHES SE NÃO FOR BEBIDA
        if(item.categoria !== 'bebida') {
            msg += ` > Massa: ${item.massa}\n > Molho: ${item.molho}\n`;
            if (item.ingredientes.length > 0) msg += ` > Ingr.: ${item.ingredientes.join(', ')}\n`; else msg += ` > Ingr.: Padrão\n`;
            if (item.extras > 0) { const valorExtras = item.extras * 2.00; msg += ` > Extras: + R$ ${valorExtras.toFixed(2).replace('.', ',')}\n`; }
        }

        msg += ` > Valor: R$ ${item.precoTotalItem.toFixed(2).replace('.', ',')}\n`;
        if (item.obs) msg += ` > OBS: ${item.obs}\n`;
    });

    msg += `\n--------------------------------\nVALORES:\nSubtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    if (tipoEntrega === 'entrega') msg += `Taxa de Entrega: R$ ${taxa.toFixed(2).replace('.', ',')}\n`; else msg += `Taxa de Entrega: R$ 0,00 (Retirada)\n`;
    msg += `TOTAL A PAGAR: R$ ${totalFinal.toFixed(2).replace('.', ',')}\n--------------------------------\nPAGAMENTO:\nForma: ${pagInput.value}\n`;
    if (pagInput.value === 'Dinheiro') {
        const valorPago = parseFloat(document.getElementById('valor-troco').value);
        if (valorPago) { const troco = valorPago - totalFinal; msg += `Vai pagar com: R$ ${valorPago.toFixed(2).replace('.', ',')}\nTROCO: R$ ${Math.max(0, troco).toFixed(2).replace('.', ',')}\n`; } else { msg += `(Cliente não informou troco)\n`; }
    }
    msg += `--------------------------------\n\n`;
    if (tipoEntrega === 'entrega') {
        const rua = document.getElementById('end-rua').value; const num = document.getElementById('end-numero').value; const bairro = document.getElementById('end-bairro').value; const cep = document.getElementById('end-cep').value; const ref = document.getElementById('end-ref').value; const tel = document.getElementById('cliente-tel').value;
        msg += `ENDERECO DE ENTREGA:\n${rua}, ${num}\nBairro: ${bairro}\n`; if(cep) msg += `CEP: ${cep}\n`; if(ref) msg += `Ref: ${ref}\n`; if(tel) msg += `Tel: ${tel}\n`;
    } else { msg += `RETIRADA NO BALCÃO\n`; }
    msg += `\nObrigado pela preferencia!`;
    window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(msg)}`);
}

function limparModal() {
    filaIngredientes = [];
    document.querySelectorAll('input').forEach(i => { i.checked = false; i.classList.remove('input-erro'); });
    document.querySelectorAll('.item-extra').forEach(e => e.classList.remove('item-extra'));
    document.querySelectorAll('.badge-extra').forEach(b => b.remove());
    document.querySelectorAll('.select-qtd').forEach(s => s.disabled = true);
    document.querySelector('textarea').value = '';
}