let appDados = JSON.parse(localStorage.getItem('escalaApp_v10')) || {
    funcionarios: [],
    escalas: {} 
};

let diaSelecionadoCriacao = null;
let dataSelecionadaLista = null;

const ordemRodizio = ['A', 'B', 'F', 'E', 'D', 'C'];
const epochSunday = new Date(Date.UTC(2025, 6, 6)); 

window.onload = function() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
    const dia = hoje.getDate().toString().padStart(2, '0');
    
    if(document.getElementById('escala-mes-ano')) document.getElementById('escala-mes-ano').value = `${ano}-${mes}`;
    if(document.getElementById('filtro-mes-ano')) document.getElementById('filtro-mes-ano').value = `${ano}-${mes}`;
    if(document.getElementById('cobertura-data')) document.getElementById('cobertura-data').value = `${ano}-${mes}-${dia}`;
    
    atualizarTabelaAuditoriaGrupos();
};

function mostrarSessao(idSessao) {
    document.querySelectorAll('.sessao').forEach(s => s.classList.remove('ativa'));
    document.getElementById(idSessao).classList.add('ativa');
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('ativa'));
    const btnAtivo = document.getElementById(`btn-nav-${idSessao}`);
    if (btnAtivo) btnAtivo.classList.add('ativa');
    
    if(idSessao === 'cadastro') atualizarTabelaAuditoriaGrupos();
    if(idSessao === 'atualizar') limparFormAtualizar();
    if(idSessao === 'criar-escala') renderizarCalendarioCriacao();
    if(idSessao === 'lista') renderizarCalendarioLista();
    if(idSessao === 'cobertura') renderizarCoberturaHora();
}

function salvarTodosDados() {
    localStorage.setItem('escalaApp_v10', JSON.stringify(appDados));
}

function shiftCoversHour(entrada, saida, horaAlvo) {
    if (!entrada || !saida) return false;
    let e = parseInt(entrada.split(':')[0]);
    let s = parseInt(saida.split(':')[0]);
    if (e <= s) return horaAlvo >= e && horaAlvo < s;
    return horaAlvo >= e || horaAlvo < s;
}

function formatarDataISO(data) {
    return `${data.getFullYear()}-${(data.getMonth()+1).toString().padStart(2,'0')}-${data.getDate().toString().padStart(2,'0')}`;
}

// --- CADASTRO E AUDITORIA DE GRUPOS ---
document.getElementById('form-cadastro').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('func-id').value.trim();
    
    if(appDados.funcionarios.some(f => f.id === id)) return alert('Este ID de matrícula já consta no banco de dados!');

    const novoFunc = {
        id: id,
        nome: document.getElementById('func-nome').value.trim(),
        grupo: document.getElementById('func-grupo').value,
        entrada: document.getElementById('func-entrada').value,
        saida: document.getElementById('func-saida').value,
        faltas: []
    };

    appDados.funcionarios.push(novoFunc);
    salvarTodosDados();
    alert('Funcionário cadastrado com sucesso!');
    this.reset();
    atualizarTabelaAuditoriaGrupos();
});

function atualizarTabelaAuditoriaGrupos() {
    const container = document.getElementById('tabela-auditoria-grupos');
    if (!container) return;

    const grupos = ['A', 'B', 'C', 'D', 'E', 'F'];
    const turnosChave = ['06:00', '08:00', '14:00', '16:00', '23:00'];

    let html = '<table><thead><tr><th>Grupo</th>';
    turnosChave.forEach(t => html += `<th>${t}</th>`);
    html += '</tr></thead><tbody>';

    grupos.forEach(g => {
        html += `<tr><td><strong>Grupo ${g}</strong></td>`;
        turnosChave.forEach(t => {
            const horaInt = parseInt(t.split(':')[0]);
            let coberturas = 0;
            appDados.funcionarios.forEach(f => {
                if (f.grupo === g && shiftCoversHour(f.entrada, f.saida, horaInt)) coberturas++;
            });

            if (horaInt === 6 || horaInt === 23) {
                if (coberturas >= 2) html += '<td style="color: var(--dourado); font-weight:bold;">✔ OK</td>';
                else if (coberturas === 1) html += '<td style="color: #ffbc42; font-weight:bold;">⚠️ APENAS 1</td>';
                else html += '<td style="color: var(--erro); font-weight:bold;">❌ LACUNA</td>';
            } else {
                if (coberturas >= 1) html += '<td style="color: var(--dourado); font-weight:bold;">✔ OK</td>';
                else html += '<td style="color: var(--erro); font-weight:bold;">❌ LACUNA</td>';
            }
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// --- ATUALIZAÇÃO ---
function filtrarBuscaAtualizar() {
    const termo = document.getElementById('busca-atualizar').value.toLowerCase();
    const ul = document.getElementById('resultado-busca-atualizar');
    ul.innerHTML = '';
    document.getElementById('form-atualizar').style.display = 'none';

    if(!termo.trim()) return;

    appDados.funcionarios.filter(f => f.nome.toLowerCase().includes(termo) || f.id.includes(termo)).forEach(func => {
        const li = document.createElement('li');
        li.innerText = `${func.nome} [Grupo ${func.grupo}] (ID: ${func.id})`;
        li.onclick = () => carregarFuncionarioParaEditar(func);
        ul.appendChild(li);
    });
}

function carregarFuncionarioParaEditar(func) {
    document.getElementById('busca-atualizar').value = func.nome;
    document.getElementById('resultado-busca-atualizar').innerHTML = '';
    document.getElementById('edit-id-original').value = func.id;
    document.getElementById('edit-nome').value = func.nome;
    document.getElementById('edit-grupo').value = func.grupo;
    document.getElementById('edit-entrada').value = func.entrada;
    document.getElementById('edit-saida').value = func.saida;
    document.getElementById('form-atualizar').style.display = 'flex';
}

document.getElementById('form-atualizar').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id-original').value;
    const idx = appDados.funcionarios.findIndex(f => f.id === id);

    if(idx > -1) {
        appDados.funcionarios[idx].nome = document.getElementById('edit-nome').value.trim();
        appDados.funcionarios[idx].grupo = document.getElementById('edit-grupo').value;
        appDados.funcionarios[idx].entrada = document.getElementById('edit-entrada').value;
        appDados.funcionarios[idx].saida = document.getElementById('edit-saida').value;
        salvarTodosDados();
        alert('Dados cadastrais atualizados!');
        limparFormAtualizar();
        atualizarTabelaAuditoriaGrupos();
    }
});

function limparFormAtualizar() {
    document.getElementById('busca-atualizar').value = '';
    document.getElementById('form-atualizar').reset();
    document.getElementById('form-atualizar').style.display = 'none';
}

// --- MOTOR INFINITO DE ROTAÇÃO DOMINICAL E FOLGAS ---
function getWeekIndex(dataStr) {
    const [ano, mes, dia] = dataStr.split('-');
    const dataUtc = new Date(Date.UTC(parseInt(ano), parseInt(mes) - 1, parseInt(dia)));
    const diasParaDomingo = (7 - dataUtc.getUTCDay()) % 7;
    const domingoDaSemana = new Date(Date.UTC(parseInt(ano), parseInt(mes) - 1, parseInt(dia) + diasParaDomingo));
    const diffMs = domingoDaSemana.getTime() - epochSunday.getTime();
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return Math.floor(diffDias / 7);
}

function obterStatusDiaColaborador(func, dataStr) {
    if (func.faltas && func.faltas.includes(dataStr)) return { status: 'falta', detalhe: 'FALTA INJUSTIFICADA' };

    if (appDados.escalas[dataStr] && appDados.escalas[dataStr][func.id]) {
        const aloc = appDados.escalas[dataStr][func.id];
        return aloc.trabalha ? { status: 'trabalho', detalhe: `${aloc.entrada} às ${aloc.saida} (Troca)` } : { status: 'folga', detalhe: 'Folga (Manual/Troca)' };
    }

    const [ano, mes, dia] = dataStr.split('-');
    const dataLocal = new Date(ano, mes - 1, dia); 
    const diaSemana = dataLocal.getDay(); 
    
    const weekIndex = getWeekIndex(dataStr);
    const idxTrabalhaDom = ((weekIndex % 6) + 6) % 6;
    const idxFolgaDupla = (((weekIndex - 1) % 6) + 6) % 6; 
    const grupoTrabalhaDom = ordemRodizio[idxTrabalhaDom];
    const grupoFolgaDupla = ordemRodizio[idxFolgaDupla];

    if (diaSemana === 6) { 
        if (func.grupo === grupoTrabalhaDom) return { status: 'folga', detalhe: 'Folga (Pré-Domingo)' };
        if (func.grupo === grupoFolgaDupla) return { status: 'folga', detalhe: 'Folga Dupla Mensal' };
        return { status: 'trabalho', detalhe: `${func.entrada} às ${func.saida}` };
    }

    if (diaSemana === 0) { 
        if (func.grupo === grupoTrabalhaDom) return { status: 'trabalho', detalhe: `${func.entrada} às ${func.saida} (DOMINGO)` };
        if (func.grupo === grupoFolgaDupla) return { status: 'folga', detalhe: 'Folga Dupla Mensal' };
        return { status: 'folga', detalhe: 'Folga DSR (6x1)' };
    }

    return { status: 'trabalho', detalhe: `${func.entrada} às ${func.saida}` };
}

function calcularCoberturaHoraEspecifica(dataStr, horaAlvo) {
    let contagem = 0;
    appDados.funcionarios.forEach(f => {
        const info = obterStatusDiaColaborador(f, dataStr);
        if (info.status === 'trabalho') {
            const partes = info.detalhe.split(' às ');
            if (partes.length === 2) {
                const hEntrada = partes[0].split(' ')[0]; 
                const hSaida = partes[1].split(' ')[0];
                if (shiftCoversHour(hEntrada, hSaida, horaAlvo)) contagem++;
            }
        }
    });
    return contagem;
}

// --- VALIDADOR DE COMPLIANCE CLT ---
function validarRegrasDeTroca(func, dataStr, novaEntrada, novaSaida, isFolga) {
    const [ano, mes, dia] = dataStr.split('-');
    const dataAlvo = new Date(ano, mes - 1, dia);
    const diaSemana = dataAlvo.getDay(); 

    if (isFolga && (diaSemana === 1 || diaSemana === 2)) return { aprovado: false, erro: 'Pico Operacional (Seg/Ter): É proibido alocar folgas manuais nestes dias de alta volumetria.' };

    if (!isFolga) {
        let ontem = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate() - 1);
        const ontemStr = formatarDataISO(ontem);
        const statusOntem = obterStatusDiaColaborador(func, ontemStr);
        
        if (statusOntem.status === 'trabalho') {
            const saidaOntem = statusOntem.detalhe.split(' às ')[1]?.split(' ')[0];
            if(saidaOntem) {
                let diff = parseInt(novaEntrada.split(':')[0]) - parseInt(saidaOntem.split(':')[0]);
                if (diff < 0) diff += 24;
                if (diff < 11) return { aprovado: false, erro: `Violação CLT Interjornada: O intervalo com o turno anterior é de ${diff}h (Mínimo: 11h).` };
            }
        }

        let amanha = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate() + 1);
        const amanhaStr = formatarDataISO(amanha);
        const statusAmanha = obterStatusDiaColaborador(func, amanhaStr);
        
        if (statusAmanha.status === 'trabalho') {
            const entradaAmanha = statusAmanha.detalhe.split(' às ')[0];
            if(entradaAmanha) {
                let diff = parseInt(entradaAmanha.split(':')[0]) - parseInt(novaSaida.split(':')[0]);
                if (diff < 0) diff += 24;
                if (diff < 11) return { aprovado: false, erro: `Violação CLT Interjornada: O intervalo com o turno seguinte é de ${diff}h (Mínimo: 11h).` };
            }
        }
    }

    let consecutivos = isFolga ? 0 : 1;
    let temp1 = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate() - 1);
    for(let i=0; i<7; i++) {
        if (obterStatusDiaColaborador(func, formatarDataISO(temp1)).status === 'trabalho') { consecutivos++; temp1.setDate(temp1.getDate() - 1); } else break;
    }
    
    let temp2 = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate() + 1);
    for(let i=0; i<7; i++) {
        if (obterStatusDiaColaborador(func, formatarDataISO(temp2)).status === 'trabalho') { consecutivos++; temp2.setDate(temp2.getDate() + 1); } else break;
    }
    
    if (consecutivos > 6) return { aprovado: false, erro: `Violação CLT: A alocação causará ${consecutivos} dias ininterruptos de trabalho sem o devido descanso.` };

    let domBase = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate());
    while(domBase.getDay() !== 0) domBase.setDate(domBase.getDate() - 1);
    
    let domingosTrabalhados = [];
    for(let i = -2; i <= 2; i++) {
        let dCheck = new Date(domBase.getFullYear(), domBase.getMonth(), domBase.getDate() + (i * 7));
        let dCheckStr = formatarDataISO(dCheck);
        let trabalhaDom = (dCheckStr === dataStr) ? !isFolga : (obterStatusDiaColaborador(func, dCheckStr).status === 'trabalho');
        domingosTrabalhados.push(trabalhaDom);
    }
    if ((domingosTrabalhados[0] && domingosTrabalhados[1] && domingosTrabalhados[2]) || 
        (domingosTrabalhados[1] && domingosTrabalhados[2] && domingosTrabalhados[3]) || 
        (domingosTrabalhados[2] && domingosTrabalhados[3] && domingosTrabalhados[4])) {
        return { aprovado: false, erro: 'Violação Operacional: Isso criará uma sequência exaustiva de 3 domingos trabalhados ininterruptamente.' };
    }

    const backup = appDados.escalas[dataStr] ? { ...appDados.escalas[dataStr] } : null;
    if(!appDados.escalas[dataStr]) appDados.escalas[dataStr] = {};
    appDados.escalas[dataStr][func.id] = { trabalha: !isFolga, entrada: novaEntrada, saida: novaSaida };
    
    const cob06 = calcularCoberturaHoraEspecifica(dataStr, 6);
    const cob23 = calcularCoberturaHoraEspecifica(dataStr, 23);
    
    if (backup) appDados.escalas[dataStr] = backup; else delete appDados.escalas[dataStr];

    if (cob06 < 2 || cob23 < 2) return { aprovado: false, erro: `Subcobertura 24/7 Detectada: A alteração causaria queda de efetivo para menos de 2 pessoas no turno de ponta (${cob06 < 2 ? '06h' : '23h'}). NEGADO.` };

    return { aprovado: true };
}

// --- INTERFACES VISUAIS ---
function renderizarCalendarioCriacao() {
    const grid = document.getElementById('calendario-criacao-grid');
    grid.innerHTML = '';
    document.getElementById('painel-atribuicao').style.display = 'none';
    diaSelecionadoCriacao = null;

    const filtro = document.getElementById('escala-mes-ano').value;
    if(!filtro) return;

    document.getElementById('calendario-criacao-container').style.display = 'block';
    const [ano, mesStr] = filtro.split('-');
    const mes = parseInt(mesStr) - 1;

    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const offsetSemanas = new Date(ano, mes, 1).getDay();

    for (let i = 0; i < offsetSemanas; i++) {
        const d = document.createElement('div'); d.classList.add('dia', 'dia-vazio'); grid.appendChild(d);
    }

    for (let dia = 1; dia <= totalDias; dia++) {
        const div = document.createElement('div');
        div.classList.add('dia'); div.innerText = dia;
        const dataStr = `${ano}-${mesStr}-${dia.toString().padStart(2, '0')}`;
        if(new Date(ano, mes, dia).getDay() === 0 || new Date(ano, mes, dia).getDay() === 6) div.classList.add('fim-semana');
        div.onclick = () => selecionarDiaParaEscalar(dataStr, div);
        grid.appendChild(div);
    }
}

function selecionarDiaParaEscalar(dataStr, elementoDiv) {
    document.querySelectorAll('#calendario-criacao-grid .dia').forEach(d => d.classList.remove('selecionado'));
    elementoDiv.classList.add('selecionado');
    diaSelecionadoCriacao = dataStr;
    const [ano, mes, dia] = dataStr.split('-');
    document.getElementById('titulo-atribuicao-dia').innerText = `Ajustar Escala para o Dia: ${dia}/${mes}/${ano}`;
    
    const select = document.getElementById('atribuir-func-select');
    select.innerHTML = '<option value="">-- Selecione o Colaborador --</option>';
    appDados.funcionarios.forEach(f => select.innerHTML += `<option value="${f.id}">${f.nome} [Grupo ${f.grupo}]</option>`);
    document.getElementById('painel-atribuicao').style.display = 'block';
    atualizarListaAtribuidosDoDia();
}

function atualizarListaAtribuidosDoDia() {
    const container = document.getElementById('lista-atribuídos-dia');
    container.innerHTML = '<strong>Alterações fixadas hoje:</strong><br>';
    const alocados = appDados.escalas[diaSelecionadoCriacao];
    if(!alocados || Object.keys(alocados).length === 0) return container.innerHTML += '<em style="font-size:13px; opacity:0.6;">Nenhuma quebra manual (Troca) para este dia.</em>';

    for(let id in alocados) {
        const func = appDados.funcionarios.find(f => f.id === id);
        const a = alocados[id];
        if(func) {
            const txt = a.trabalha ? `${a.entrada} às ${a.saida}` : `<span style="color:var(--erro)">FOLGA MANUAL</span>`;
            container.innerHTML += `<div style="font-size:14px; margin-top:5px;">• ${func.nome}: <strong>${txt}</strong></div>`;
        }
    }
}

document.getElementById('form-atribuir-escala').addEventListener('submit', function(e) {
    e.preventDefault();
    const funcId = document.getElementById('atribuir-func-select').value;
    const entrada = document.getElementById('atribuir-entrada').value;
    const saida = document.getElementById('atribuir-saida').value;
    const isFolga = document.getElementById('atribuir-folga-checkbox').checked;

    if(!funcId || !diaSelecionadoCriacao) return;
    const func = appDados.funcionarios.find(f => f.id === funcId);

    if(!isFolga && (!entrada || !saida)) return alert('Preencha os horários ou selecione a folga.');

    const validacao = validarRegrasDeTroca(func, diaSelecionadoCriacao, entrada, saida, isFolga);
    if (!validacao.aprovado) return alert("❌ BLOQUEIO DE COMPLIANCE:\n\n" + validacao.erro);

    if(!appDados.escalas[diaSelecionadoCriacao]) appDados.escalas[diaSelecionadoCriacao] = {};
    appDados.escalas[diaSelecionadoCriacao][funcId] = { trabalha: !isFolga, entrada: entrada, saida: saida };

    salvarTodosDados();
    alert('Escala alterada em total conformidade com regras e CLT!');
    this.reset();
    atualizarListaAtribuidosDoDia();
});

function renderizarCoberturaHora() {
    const dataInput = document.getElementById('cobertura-data').value;
    const container = document.getElementById('cobertura-resultado');
    if (!container || !dataInput) return;

    let html = `<h3>Volumetria Detalhada: ${dataInput.split('-').reverse().join('/')}</h3><br><table><thead><tr><th>Horário</th><th>Headcount Ativo Global</th><th>Status de Risco</th></tr></thead><tbody>`;

    for (let h = 0; h < 24; h++) {
        const qtd = calcularCoberturaHoraEspecifica(dataInput, h);
        const horaFormatada = h.toString().padStart(2, '0') + ':00';
        let statusTexto = '✔ Estável'; let styleLinha = '';

        if ((h === 6 || h === 23) && qtd < 2) { statusTexto = '❌ VERMELHO: RISCO (Abaixo de 2)'; styleLinha = 'style="background-color: var(--erro); color: white; font-weight: bold;"'; } 
        else if (qtd === 0) { statusTexto = '⚠ Zero Cobertura'; styleLinha = 'style="opacity: 0.5;"'; }

        html += `<tr ${styleLinha}><td>${horaFormatada}</td><td><strong>${qtd} Técnico(s)</strong></td><td>${statusTexto}</td></tr>`;
    }
    container.innerHTML = html + '</tbody></table>';
}

function aoMudarMesAnoLista() { renderizarCalendarioLista(); }

function renderizarCalendarioLista() {
    const grid = document.getElementById('calendario-lista-grid');
    grid.innerHTML = '';
    document.getElementById('detalhes-dia-container').style.display = 'none';
    const filtro = document.getElementById('filtro-mes-ano').value;
    if(!filtro) return;

    const [ano, mesStr] = filtro.split('-');
    const mesIdx = parseInt(mesStr) - 1;
    const dataAux = new Date(ano, mesIdx, 1);
    
    document.getElementById('calendario-lista-titulo').innerText = `${dataAux.toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} / ${ano}`;
    document.getElementById('calendario-lista-container').style.display = 'block';

    const totalDias = new Date(ano, mesIdx + 1, 0).getDate();
    const offsetSemanas = dataAux.getDay();

    for (let i = 0; i < offsetSemanas; i++) {
        const d = document.createElement('div'); d.classList.add('dia', 'dia-vazio'); grid.appendChild(d);
    }

    for (let dia = 1; dia <= totalDias; dia++) {
        const div = document.createElement('div');
        div.classList.add('dia'); div.innerText = dia;
        const dataStr = `${ano}-${mesStr}-${dia.toString().padStart(2, '0')}`;
        if(new Date(ano, mesIdx, dia).getDay() === 0 || new Date(ano, mesIdx, dia).getDay() === 6) div.classList.add('fim-semana');
        div.onclick = () => exibirTrabalhadoresDoDia(dataStr, div);
        grid.appendChild(div);
    }
}

// --- NOVO SISTEMA DE TABELA COM FILTROS E ORDENAÇÃO ---
function exibirTrabalhadoresDoDia(dataStr, elementoDiv) {
    document.querySelectorAll('#calendario-lista-grid .dia').forEach(d => d.classList.remove('selecionado'));
    if(elementoDiv) elementoDiv.classList.add('selecionado');
    
    dataSelecionadaLista = dataStr;
    const [ano, mes, dia] = dataStr.split('-');
    document.getElementById('detalhes-dia-titulo').innerText = `Quadro Ativo no Turno: ${dia}/${mes}/${ano}`;

    // Limpa a busca ao trocar de dia para não confundir o usuário
    document.getElementById('filtro-tabela-dia').value = '';
    
    document.getElementById('detalhes-dia-container').style.display = 'block';
    renderizarTabelaDia();
}

function renderizarTabelaDia() {
    if (!dataSelecionadaLista) return;

    const termoBusca = document.getElementById('filtro-tabela-dia').value.toLowerCase();
    const tipoOrdenacao = document.getElementById('ordenar-tabela-dia').value;
    const tbody = document.querySelector('#tabela-funcionarios-dia tbody');
    tbody.innerHTML = '';

    // 1. Aplica o Filtro de Busca por Nome/ID
    let funcionariosFiltrados = appDados.funcionarios.filter(f => {
        return f.nome.toLowerCase().includes(termoBusca) || f.id.toLowerCase().includes(termoBusca);
    });

    // 2. Aplica a Ordenação (Com Lógica de Desempate Múltiplo)
    funcionariosFiltrados.sort((a, b) => {
        
        // ORDENAÇÃO POR GRUPO
        if (tipoOrdenacao === 'grupo') {
            if (a.grupo === b.grupo) return a.nome.localeCompare(b.nome); // Desempata pelo nome
            return a.grupo.localeCompare(b.grupo);
        }
        
        // ORDENAÇÃO POR NOME
        if (tipoOrdenacao === 'nome') {
            return a.nome.localeCompare(b.nome);
        }
        
        // ORDENAÇÃO POR MATRÍCULA
        if (tipoOrdenacao === 'id_asc') {
            const idA = parseInt(a.id);
            const idB = parseInt(b.id);
            if (!isNaN(idA) && !isNaN(idB)) return idA - idB; // Caso sejam números
            return a.id.localeCompare(b.id); // Caso sejam letras (EX: A001)
        }
        
        if (tipoOrdenacao === 'id_desc') {
            const idA = parseInt(a.id);
            const idB = parseInt(b.id);
            if (!isNaN(idA) && !isNaN(idB)) return idB - idA;
            return b.id.localeCompare(a.id);
        }

        // ORDENAÇÃO INTELIGENTE POR STATUS (Quem trabalha aparece primeiro)
        if (tipoOrdenacao === 'status') {
            const infoA = obterStatusDiaColaborador(a, dataSelecionadaLista);
            const infoB = obterStatusDiaColaborador(b, dataSelecionadaLista);
            
            // Pesos: 1 para quem está ativo, 2 para quem faltou, 3 para quem está de folga
            const pesos = { 'trabalho': 1, 'falta': 2, 'folga': 3 };
            const pesoA = pesos[infoA.status] || 4;
            const pesoB = pesos[infoB.status] || 4;

            if (pesoA !== pesoB) return pesoA - pesoB;
            
            // Se tiverem o mesmo status, desempata pelo Grupo, e depois pelo Nome
            if (a.grupo === b.grupo) return a.nome.localeCompare(b.nome);
            return a.grupo.localeCompare(b.grupo);
        }

        return 0;
    });

    // 3. Monta as Linhas na Tabela
    funcionariosFiltrados.forEach(f => {
        const info = obterStatusDiaColaborador(f, dataSelecionadaLista);
        const tr = document.createElement('tr');
        let visual = '';
        
        if(info.status === 'trabalho') {
            visual = `<span style="color:var(--dourado); font-weight:bold;">${info.detalhe}</span>`;
        } else if(info.status === 'falta') {
            visual = `<span style="color:var(--erro); font-weight:bold;">${info.detalhe}</span>`;
        } else {
            visual = `<span style="opacity:0.6;">${info.detalhe}</span>`;
        }

        tr.innerHTML = `<td>${f.id}</td><td><strong>${f.nome}</strong></td><td>Grupo ${f.grupo}</td><td>${visual}</td>`;
        tbody.appendChild(tr);
    });
}

// --- FALTAS ---
document.getElementById('busca-func').addEventListener('input', function() {
    const termo = this.value.toLowerCase();
    const ul = document.getElementById('resultado-busca');
    ul.innerHTML = '';
    if (!termo) return;

    appDados.funcionarios.filter(f => f.nome.toLowerCase().includes(termo) || f.id.includes(termo)).forEach(func => {
        const li = document.createElement('li');
        li.innerText = `${func.nome} (ID: ${func.id})`;
        li.onclick = () => {
            document.getElementById('busca-func').value = func.nome;
            document.getElementById('falta-id-selecionado').value = func.id;
            ul.innerHTML = '';
        };
        ul.appendChild(li);
    });
});

document.getElementById('form-falta').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('falta-id-selecionado').value;
    const dataFalta = document.getElementById('data-falta').value;
    const idx = appDados.funcionarios.findIndex(f => f.id === id);

    if (idx > -1) {
        if (!appDados.funcionarios[idx].faltas) appDados.funcionarios[idx].faltas = [];
        if (!appDados.funcionarios[idx].faltas.includes(dataFalta)) {
            appDados.funcionarios[idx].faltas.push(dataFalta);
            salvarTodosDados();
            alert('Falta injustificada registrada com sucesso.');
            this.reset();
        } else alert('Falta já mapeada nesta data.');
    }
});

function exportarJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appDados, null, 2));
    const link = document.createElement('a'); link.href = dataStr; link.download = "backup_escala_segura.json"; link.click();
}

// --- EXPORTAÇÃO EXCELJS ---
async function exportarParaExcel() {
    const filtro = document.getElementById('filtro-mes-ano').value;
    if(!filtro) return alert('Por favor, selecione o Mês/Ano na tela de Lista e Calendários antes de baixar.');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EscalaApp Corporativo';

    const [ano, mesStr] = filtro.split('-');
    const totalDias = new Date(ano, parseInt(mesStr), 0).getDate();

    const dataAux = new Date(ano, parseInt(mesStr) - 1, 1);
    const tituloMesAno = `${dataAux.toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} ${ano}`;

    const coresGrupo = {
        'A': 'FFD9E1F2', 'B': 'FFE2EFDA', 'C': 'FFFFF2CC', 
        'D': 'FFFCE4D6', 'E': 'FFE4DFEC', 'F': 'FFD0CECE'
    };
    
    // ABA 1: ESCALA OPERACIONAL
    const sheetEscala = workbook.addWorksheet('Escala Mensal');
    
    const linhaTituloEscala = sheetEscala.addRow([`MAPA OPERACIONAL - CENTRAL DE RELACIONAMENTO - ${tituloMesAno}`]);
    sheetEscala.mergeCells(1, 1, 1, totalDias + 4);
    linhaTituloEscala.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A1C12' } };
    linhaTituloEscala.getCell(1).font = { color: { argb: 'FFD4AF37' }, bold: true, size: 14 };
    linhaTituloEscala.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const linhaSubtituloEscala = sheetEscala.addRow(['Escala 6x1 | Folgas alternadas Sáb/Dom por grupo | Cada grupo tem 1 FOLGA DUPLA (FDS completo) por mês como quebra | Mínimo 2 colaboradores nos horários de ponta 06h e 23h | 24/7']);
    sheetEscala.mergeCells(2, 1, 2, totalDias + 4);
    linhaSubtituloEscala.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF133321' } };
    linhaSubtituloEscala.getCell(1).font = { color: { argb: 'FFE8F5E9' }, italic: true, size: 10 };
    linhaSubtituloEscala.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const cabecalhoEscala = ['ID', 'Colaborador', 'Grupo', 'Turno'];
    for(let d = 1; d <= totalDias; d++) cabecalhoEscala.push(`${d.toString().padStart(2, '0')}/${mesStr}`);
    const cabecalhoRow = sheetEscala.addRow(cabecalhoEscala);
    
    cabecalhoRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF133321' } };
        cell.font = { color: { argb: 'FFD4AF37' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    sheetEscala.views = [{ state: 'frozen', xSplit: 4, ySplit: 3 }];

    appDados.funcionarios.forEach(f => {
        const linhaDados = [f.id, f.nome, `Grupo ${f.grupo}`, `${f.entrada} - ${f.saida}`];
        for(let d = 1; d <= totalDias; d++) {
            const dataStr = `${ano}-${mesStr}-${d.toString().padStart(2, '0')}`;
            linhaDados.push(obterStatusDiaColaborador(f, dataStr).detalhe);
        }
        const row = sheetEscala.addRow(linhaDados);
        
        row.eachCell((cell, colNumber) => {
            cell.border = { top: {style:'thin', color:{argb:'FFCCCCCC'}}, left: {style:'thin', color:{argb:'FFCCCCCC'}}, bottom: {style:'thin', color:{argb:'FFCCCCCC'}}, right: {style:'thin', color:{argb:'FFCCCCCC'}} };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };

            if (colNumber === 3) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: coresGrupo[f.grupo] || 'FFFFFFFF' } };
                cell.font = { bold: true };
            }

            if (colNumber > 4) {
                const valor = cell.value.toString();
                if (valor.includes('FALTA')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
                    cell.font = { color: { argb: 'FF9C0006' }, bold: true };
                } else if (valor.includes('Folga')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                    cell.font = { color: { argb: 'FF7F7F7F' }, italic: true };
                } else {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } };
                    cell.font = { color: { argb: 'FF375623' } };
                }
            }
        });
    });

    sheetEscala.getColumn(1).width = 10;
    sheetEscala.getColumn(2).width = 30;
    sheetEscala.getColumn(3).width = 12;
    sheetEscala.getColumn(4).width = 15;
    for(let i = 5; i <= totalDias + 4; i++) sheetEscala.getColumn(i).width = 18;

    // ABA 2: COBERTURA POR HORA
    const sheetCobertura = workbook.addWorksheet('Cobertura por Hora');
    
    const linhaTituloCobertura = sheetCobertura.addRow([`ANÁLISE DE COBERTURA POR HORA – ${tituloMesAno}  |  🔴 < 2 pessoas (RISCO)  |  🟡 2-4  |  🟢 5+`]);
    sheetCobertura.mergeCells(1, 1, 1, totalDias + 1);
    linhaTituloCobertura.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A1C12' } };
    linhaTituloCobertura.getCell(1).font = { color: { argb: 'FFD4AF37' }, bold: true, size: 12 };
    linhaTituloCobertura.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const cabecalhoCobertura = ['Horário / Dia'];
    for(let d = 1; d <= totalDias; d++) cabecalhoCobertura.push(`${d.toString().padStart(2, '0')}/${mesStr}`);
    const rowCobCabecalho = sheetCobertura.addRow(cabecalhoCobertura);
    
    rowCobCabecalho.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF133321' } };
        cell.font = { color: { argb: 'FFD4AF37' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    sheetCobertura.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];

    for (let h = 0; h < 24; h++) {
        const linhaCob = [`${h.toString().padStart(2, '0')}:00`];
        for(let d = 1; d <= totalDias; d++) {
            const dataStr = `${ano}-${mesStr}-${d.toString().padStart(2, '0')}`;
            linhaCob.push(calcularCoberturaHoraEspecifica(dataStr, h));
        }
        const row = sheetCobertura.addRow(linhaCob);

        row.eachCell((cell, colNumber) => {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            if (colNumber === 1) cell.font = { bold: true };
            
            if (colNumber > 1) {
                const qtd = parseInt(cell.value);
                if (qtd < 2) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
                    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                } else if (qtd >= 2 && qtd <= 4) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
                    cell.font = { color: { argb: 'FF000000' }, bold: true };
                } else {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
                    cell.font = { color: { argb: 'FF000000' } };
                }
            }
        });
    }
    sheetCobertura.getColumn(1).width = 15;

    // ABA 3: RESUMO OPERACIONAL
    const sheetResumo = workbook.addWorksheet('Resumo Operacional');
    sheetResumo.getColumn(1).width = 45;
    sheetResumo.getColumn(2).width = 20;

    const tituloResumo = sheetResumo.addRow([`RESUMO OPERACIONAL – ${tituloMesAno}`]);
    sheetResumo.mergeCells('A1:B1');
    tituloResumo.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A1C12' } };
    tituloResumo.getCell(1).font = { color: { argb: 'FFD4AF37' }, bold: true, size: 14 };
    tituloResumo.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    sheetResumo.addRow([]);

    const adcTitulo = (texto) => {
        const r = sheetResumo.addRow([texto]);
        r.getCell(1).font = { bold: true, color: { argb: 'FFD4AF37' } };
        r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF133321' } };
        sheetResumo.mergeCells(`A${r.number}:B${r.number}`);
    };

    const adcDado = (rotulo, valor) => {
        const r = sheetResumo.addRow([rotulo, valor]);
        r.getCell(1).font = { bold: true };
        r.getCell(2).alignment = { horizontal: 'center' };
    };

    adcTitulo('📊 VISÃO GERAL DO QUADRO');
    adcDado('Total de Colaboradores Cadastrados', appDados.funcionarios.length);
    sheetResumo.addRow([]);

    adcTitulo('👥 DISTRIBUIÇÃO POR GRUPOS');
    const contagemGrupos = { 'A':0, 'B':0, 'C':0, 'D':0, 'E':0, 'F':0 };
    appDados.funcionarios.forEach(f => { if(contagemGrupos[f.grupo] !== undefined) contagemGrupos[f.grupo]++; });
    
    Object.keys(contagemGrupos).forEach(g => {
        const r = sheetResumo.addRow([`Tamanho do Grupo ${g}`, contagemGrupos[g]]);
        r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: coresGrupo[g] } };
        r.getCell(2).alignment = { horizontal: 'center' };
    });

    sheetResumo.addRow([]);
    adcTitulo('⚠️ ÍNDICE DE OCORRÊNCIAS NO MÊS');
    
    let totalFaltasNoMes = 0;
    appDados.funcionarios.forEach(f => {
        if(f.faltas) {
            f.faltas.forEach(faltaData => {
                if(faltaData.startsWith(`${ano}-${mesStr}`)) totalFaltasNoMes++;
            });
        }
    });
    adcDado('Ausências Injustificadas / Faltas', totalFaltasNoMes);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Escala_Corporativa_${mesStr}_${ano}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
}