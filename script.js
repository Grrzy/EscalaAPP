let appDados = JSON.parse(localStorage.getItem('escalaApp_v12')) || 
               JSON.parse(localStorage.getItem('escalaApp_v10')) || {
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
    if(document.getElementById('escala-excel-mes')) document.getElementById('escala-excel-mes').value = `${ano}-${mes}`;
    
    if(document.getElementById('escala-excel')) {
        renderizarEscalaExcel();
    } else {
        renderizarCalendarioLista();
    }
};

// --- MÓDULO DE MENU RETRÁTIL (HAMBÚRGUER) ---
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('mobile-aberto');
    } else {
        sidebar.classList.toggle('recolhida');
    }
}

function mostrarSessao(idSessao) {
    document.querySelectorAll('.sessao').forEach(s => s.classList.remove('ativa'));
    const sessaoAlvo = document.getElementById(idSessao);
    if (sessaoAlvo) sessaoAlvo.classList.add('ativa');
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('ativa'));
    const btnAtivo = document.getElementById(`btn-nav-${idSessao}`);
    if (btnAtivo) btnAtivo.classList.add('ativa');
    
    if(idSessao === 'cadastro') atualizarTabelaAuditoriaGrupos();
    if(idSessao === 'atualizar') limparFormAtualizar();
    if(idSessao === 'criar-escala') renderizarCalendarioCriacao();
    if(idSessao === 'lista') renderizarCalendarioLista();
    if(idSessao === 'cobertura') renderizarCoberturaHora();
    if(idSessao === 'escala-excel') renderizarEscalaExcel();

    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth <= 768) sidebar.classList.remove('mobile-aberto');
}

function salvarTodosDados() {
    localStorage.setItem('escalaApp_v12', JSON.stringify(appDados));
}

// --- IMPORTAÇÃO/EXPORTAÇÃO DE DADOS ---
function exportarJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appDados, null, 2));
    const link = document.createElement('a'); 
    link.href = dataStr; 
    link.download = "escalaapp_backup_dados.json"; 
    link.click();
}

function importarJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dadosImportados = JSON.parse(e.target.result);
            if (dadosImportados.funcionarios && typeof dadosImportados.escalas === 'object') {
                appDados = dadosImportados;
                salvarTodosDados();
                alert('Dados importados com sucesso! O sistema será recarregado.');
                location.reload(); 
            } else { alert('Erro: Estrutura inválida.'); }
        } catch (error) { alert('Erro ao ler JSON. Arquivo corrompido.'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}


// --- LÓGICA CORE DE HORÁRIOS E DATAS ---
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
    let almIni = func.almocoInicio || '12:00';
    let almFim = func.almocoFim || '13:00';

    if (func.faltas && func.faltas.includes(dataStr)) return { status: 'falta', detalhe: 'FALTA INJUSTIFICADA' };

    if (appDados.escalas[dataStr] && appDados.escalas[dataStr][func.id]) {
        const aloc = appDados.escalas[dataStr][func.id];
        if (aloc.trabalha) {
            return { status: 'trabalho', detalhe: `${aloc.entrada} às ${aloc.saida}`, entrada: aloc.entrada, saida: aloc.saida, almocoInicio: aloc.almocoInicio || almIni, almocoFim: aloc.almocoFim || almFim };
        } else {
            return { status: 'folga', detalhe: 'Folga (Manual)' };
        }
    }

    const [ano, mes, dia] = dataStr.split('-');
    const dataLocal = new Date(ano, mes - 1, dia); 
    const diaSemana = dataLocal.getDay(); 
    
    const weekIndex = getWeekIndex(dataStr);
    const idxTrabalhaDom = ((weekIndex % 6) + 6) % 6;
    const idxFolgaDupla = (((weekIndex - 1) % 6) + 6) % 6; 
    const grupoTrabalhaDom = ordemRodizio[idxTrabalhaDom];
    const grupoFolgaDupla = ordemRodizio[idxFolgaDupla];

    let baseTrabalho = { status: 'trabalho', detalhe: `${func.entrada} às ${func.saida}`, entrada: func.entrada, saida: func.saida, almocoInicio: almIni, almocoFim: almFim };

    if (diaSemana === 6) { 
        if (func.grupo === grupoTrabalhaDom) return { status: 'folga', detalhe: 'Folga (Pré-Domingo)' };
        if (func.grupo === grupoFolgaDupla) return { status: 'folga', detalhe: 'Folga Dupla Mensal' };
        return baseTrabalho;
    }

    if (diaSemana === 0) { 
        if (func.grupo === grupoTrabalhaDom) return baseTrabalho;
        if (func.grupo === grupoFolgaDupla) return { status: 'folga', detalhe: 'Folga Dupla Mensal' };
        return { status: 'folga', detalhe: 'Folga DSR' };
    }

    return baseTrabalho;
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
    
    if (consecutivos > 6) return { aprovado: false, erro: `Violação CLT: A alocação causará ${consecutivos} dias ininterruptos de trabalho.` };

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
        return { aprovado: false, erro: 'Violação Operacional: 3 domingos trabalhados ininterruptamente.' };
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


// ============================================================================
// NOVO MÓDULO: ESCALA EXCEL (INTERATIVA COM IDENTIFICAÇÃO DE FOLGAS)
// ============================================================================

const coresGrupoExcel = { 'A': '#D9E1F2', 'B': '#E2EFDA', 'C': '#FFF2CC', 'D': '#FCE4D6', 'E': '#E4DFEC', 'F': '#D0CECE' };

function renderizarEscalaExcel() {
    const mesAnoInput = document.getElementById('escala-excel-mes');
    if (!mesAnoInput || !mesAnoInput.value) return;
    const mesAno = mesAnoInput.value;
    
    const modoSelect = document.getElementById('escala-excel-modo');
    const modoView = modoSelect ? modoSelect.value : 'resumo';

    const [ano, mesStr] = mesAno.split('-');
    const totalDias = new Date(ano, parseInt(mesStr), 0).getDate();
    
    const thead = document.getElementById('tabela-excel-head');
    const tbody = document.getElementById('tabela-excel-body');
    if(!thead || !tbody) return;

    thead.innerHTML = '';
    tbody.innerHTML = '';

    let trHead = document.createElement('tr');
    trHead.innerHTML = `<th class="col-fixa">ID</th><th class="col-fixa" style="left: 45px; min-width: 200px;">Colaborador</th><th>Grupo</th><th>Turno Fixo</th>`;
    
    const diasSemanaNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for(let d = 1; d <= totalDias; d++) {
        let diaData = new Date(ano, parseInt(mesStr)-1, d);
        let diaNome = diasSemanaNomes[diaData.getDay()];
        trHead.innerHTML += `<th>${d.toString().padStart(2,'0')}/${mesStr}<br><span style="font-size:10px; font-weight:normal;">${diaNome}</span></th>`;
    }
    thead.appendChild(trHead);

    let funcionariosOrdenados = [...appDados.funcionarios].sort((a, b) => {
        if(a.grupo === b.grupo) return a.nome.localeCompare(b.nome);
        return a.grupo.localeCompare(b.grupo);
    });

    funcionariosOrdenados.forEach(f => {
        let tr = document.createElement('tr');
        
        let corGrupo = coresGrupoExcel[f.grupo] || '#FFFFFF';
        tr.innerHTML += `<td class="col-fixa" style="background-color: var(--excel-header);">${f.id}</td>`;
        tr.innerHTML += `<td class="col-fixa" style="left: 45px; text-align: left;"><strong>${f.nome}</strong></td>`;
        tr.innerHTML += `<td style="background-color: ${corGrupo}; color: #000;">Grupo ${f.grupo}</td>`;
        tr.innerHTML += `<td>${f.entrada}-${f.saida}</td>`;

        for(let d = 1; d <= totalDias; d++) {
            const dataStr = `${ano}-${mesStr}-${d.toString().padStart(2, '0')}`;
            const info = obterStatusDiaColaborador(f, dataStr);
            
            let td = document.createElement('td');
            td.className = 'td-dia';
            
            let txtPlanilha = '';

            if (info.status === 'falta') {
                td.style.backgroundColor = '#FFC7CE'; td.style.color = '#9C0006'; td.style.fontWeight = 'bold';
                txtPlanilha = 'FALTA';
            } else if (info.status === 'folga') {
                if (info.detalhe.includes('Dupla')) {
                    txtPlanilha = 'FOLGA DUPLA';
                    td.style.backgroundColor = '#D9E1F2'; 
                    td.style.color = '#305496';
                    td.style.fontWeight = 'bold';
                } else if (info.detalhe.includes('Manual')) {
                    txtPlanilha = 'FOLGA (MANUAL)';
                    td.style.backgroundColor = '#FFF2CC'; 
                    td.style.color = '#8A6D3B';
                    td.style.fontWeight = 'bold';
                } else {
                    txtPlanilha = 'FOLGA 6X1';
                    td.style.backgroundColor = '#F2F2F2'; 
                    td.style.color = '#7F7F7F';
                }
            } else {
                td.style.backgroundColor = '#EBF1DE'; td.style.color = '#375623';
                if (modoView === 'detalhado') {
                    txtPlanilha = `<div class="bloco-detalhe"><span class="b-ent">E: ${info.entrada}</span><span class="b-alm">A: ${info.almocoInicio}-${info.almocoFim}</span><span class="b-sai">S: ${info.saida}</span></div>`;
                } else {
                    txtPlanilha = info.detalhe.replace(' às ', '-').replace(' (DOMINGO)', '').replace(' (Troca)', '*');
                }
            }

            td.innerHTML = txtPlanilha;
            td.onclick = () => abrirModalExcel(f.id, dataStr);
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });
}

function abrirModalExcel(funcId, dataStr) {
    const f = appDados.funcionarios.find(x => x.id === funcId);
    if (!f) return;

    const [ano, mes, dia] = dataStr.split('-');
    
    if(document.getElementById('modal-titulo-excel')) document.getElementById('modal-titulo-excel').innerText = `Editar Turno de ${f.nome}`;
    if(document.getElementById('modal-subtitulo-excel')) document.getElementById('modal-subtitulo-excel').innerText = `Data alvo: ${dia}/${mes}/${ano}`;
    
    if(document.getElementById('modal-func-id')) document.getElementById('modal-func-id').value = funcId;
    if(document.getElementById('modal-data-str')) document.getElementById('modal-data-str').value = dataStr;
    
    let isFolga = false;
    let ent = f.entrada;
    let sai = f.saida;
    let aIni = f.almocoInicio || '12:00';
    let aFim = f.almocoFim || '13:00';

    if (appDados.escalas[dataStr] && appDados.escalas[dataStr][funcId]) {
        const aloc = appDados.escalas[dataStr][funcId];
        isFolga = !aloc.trabalha;
        ent = aloc.entrada || ent;
        sai = aloc.saida || sai;
        aIni = aloc.almocoInicio || aIni;
        aFim = aloc.almocoFim || aFim;
    }

    if(document.getElementById('modal-folga-checkbox')) document.getElementById('modal-folga-checkbox').checked = isFolga;
    if(document.getElementById('modal-entrada')) document.getElementById('modal-entrada').value = ent;
    if(document.getElementById('modal-saida')) document.getElementById('modal-saida').value = sai;
    if(document.getElementById('modal-almoco-inicio')) document.getElementById('modal-almoco-inicio').value = aIni;
    if(document.getElementById('modal-almoco-fim')) document.getElementById('modal-almoco-fim').value = aFim;

    const modal = document.getElementById('modal-edicao-excel');
    if (modal) modal.style.display = 'flex';
}

function fecharModalExcel() {
    const modal = document.getElementById('modal-edicao-excel');
    const form = document.getElementById('form-edicao-excel');
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
}

const formEdicaoExcel = document.getElementById('form-edicao-excel');
if (formEdicaoExcel) {
    formEdicaoExcel.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const funcId = document.getElementById('modal-func-id').value;
        const dataStr = document.getElementById('modal-data-str').value;
        
        const chkFolga = document.getElementById('modal-folga-checkbox');
        const isFolga = chkFolga ? chkFolga.checked : false;
        
        const entrada = document.getElementById('modal-entrada') ? document.getElementById('modal-entrada').value : '';
        const saida = document.getElementById('modal-saida') ? document.getElementById('modal-saida').value : '';
        const aIni = document.getElementById('modal-almoco-inicio') ? document.getElementById('modal-almoco-inicio').value : '12:00';
        const aFim = document.getElementById('modal-almoco-fim') ? document.getElementById('modal-almoco-fim').value : '13:00';

        const func = appDados.funcionarios.find(f => f.id === funcId);

        if(!isFolga && (!entrada || !saida)) return alert('Preencha os horários ou marque Folga.');

        const validacao = validarRegrasDeTroca(func, dataStr, entrada, saida, isFolga);
        if (!validacao.aprovado) return alert("❌ BLOQUEIO DE COMPLIANCE:\n\n" + validacao.erro);

        if(!appDados.escalas[dataStr]) appDados.escalas[dataStr] = {};
        appDados.escalas[dataStr][funcId] = { trabalha: !isFolga, entrada: entrada, saida: saida, almocoInicio: aIni, almocoFim: aFim };

        salvarTodosDados();
        fecharModalExcel();
        renderizarEscalaExcel(); 
    });
}


// ============================================================================
// DEMAIS FUNÇÕES DO SISTEMA E EXPORTAÇÃO EXCEL MANTIDAS
// ============================================================================

// --- CADASTRO E AUDITORIA DE GRUPOS ---
const formCadastro = document.getElementById('form-cadastro');
if (formCadastro) {
    formCadastro.addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('func-id').value.trim();
        if(appDados.funcionarios.some(f => f.id === id)) return alert('Este ID de matrícula já consta!');
        
        const almIniObj = document.getElementById('func-almoco-inicio');
        const almFimObj = document.getElementById('func-almoco-fim');
        const sexoObj = document.getElementById('func-sexo'); // CAPTAÇÃO DO NOVO CAMPO DE SEXO

        const novoFunc = { 
            id: id, 
            nome: document.getElementById('func-nome').value.trim(), 
            sexo: sexoObj ? sexoObj.value : 'M', // SALVA O SEXO OU ASSUME 'M' COMO FALLBACK
            grupo: document.getElementById('func-grupo').value, 
            entrada: document.getElementById('func-entrada').value, 
            saida: document.getElementById('func-saida').value, 
            almocoInicio: almIniObj ? almIniObj.value : '12:00',
            almocoFim: almFimObj ? almFimObj.value : '13:00',
            faltas: [] 
        };
        appDados.funcionarios.push(novoFunc);
        salvarTodosDados();
        alert('Cadastrado com sucesso!');
        this.reset();
        atualizarTabelaAuditoriaGrupos();
    });
}

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
            const horaInt = parseInt(t.split(':')[0]); let coberturas = 0;
            appDados.funcionarios.forEach(f => { if (f.grupo === g && shiftCoversHour(f.entrada, f.saida, horaInt)) coberturas++; });
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
    container.innerHTML = html + '</tbody></table>';
}

// --- ATUALIZAÇÃO ---
function filtrarBuscaAtualizar() {
    const buscaObj = document.getElementById('busca-atualizar');
    if(!buscaObj) return;
    const termo = buscaObj.value.toLowerCase();
    const ul = document.getElementById('resultado-busca-atualizar');
    if(ul) ul.innerHTML = '';
    const formAt = document.getElementById('form-atualizar');
    if(formAt) formAt.style.display = 'none';
    
    if(!termo.trim()) return;
    appDados.funcionarios.filter(f => f.nome.toLowerCase().includes(termo) || f.id.includes(termo)).forEach(func => {
        const li = document.createElement('li');
        li.innerText = `${func.nome} [Grupo ${func.grupo}] (ID: ${func.id})`;
        li.onclick = () => carregarFuncionarioParaEditar(func);
        if(ul) ul.appendChild(li);
    });
}

function carregarFuncionarioParaEditar(func) {
    if(document.getElementById('busca-atualizar')) document.getElementById('busca-atualizar').value = func.nome;
    if(document.getElementById('resultado-busca-atualizar')) document.getElementById('resultado-busca-atualizar').innerHTML = '';
    if(document.getElementById('edit-id-original')) document.getElementById('edit-id-original').value = func.id; 
    if(document.getElementById('edit-nome')) document.getElementById('edit-nome').value = func.nome;
    if(document.getElementById('edit-sexo')) document.getElementById('edit-sexo').value = func.sexo || 'M'; // CARREGA O SEXO DO JSON OU ASSUME M
    if(document.getElementById('edit-grupo')) document.getElementById('edit-grupo').value = func.grupo; 
    if(document.getElementById('edit-entrada')) document.getElementById('edit-entrada').value = func.entrada;
    if(document.getElementById('edit-saida')) document.getElementById('edit-saida').value = func.saida; 
    
    if(document.getElementById('edit-almoco-inicio')) document.getElementById('edit-almoco-inicio').value = func.almocoInicio || '12:00';
    if(document.getElementById('edit-almoco-fim')) document.getElementById('edit-almoco-fim').value = func.almocoFim || '13:00';

    if(document.getElementById('form-atualizar')) document.getElementById('form-atualizar').style.display = 'flex';
}

const formAtualizar = document.getElementById('form-atualizar');
if (formAtualizar) {
    formAtualizar.addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('edit-id-original').value;
        const idx = appDados.funcionarios.findIndex(f => f.id === id);
        if(idx > -1) {
            appDados.funcionarios[idx].nome = document.getElementById('edit-nome').value.trim();
            if(document.getElementById('edit-sexo')) appDados.funcionarios[idx].sexo = document.getElementById('edit-sexo').value; // ATUALIZA O SEXO
            appDados.funcionarios[idx].grupo = document.getElementById('edit-grupo').value;
            appDados.funcionarios[idx].entrada = document.getElementById('edit-entrada').value;
            appDados.funcionarios[idx].saida = document.getElementById('edit-saida').value;
            
            if(document.getElementById('edit-almoco-inicio')) appDados.funcionarios[idx].almocoInicio = document.getElementById('edit-almoco-inicio').value;
            if(document.getElementById('edit-almoco-fim')) appDados.funcionarios[idx].almocoFim = document.getElementById('edit-almoco-fim').value;
            
            salvarTodosDados(); alert('Atualizado!'); limparFormAtualizar(); atualizarTabelaAuditoriaGrupos();
        }
    });
}

function limparFormAtualizar() { 
    if(document.getElementById('busca-atualizar')) document.getElementById('busca-atualizar').value = ''; 
    const formAt = document.getElementById('form-atualizar');
    if(formAt) { formAt.reset(); formAt.style.display = 'none'; }
}

// --- INTERFACES VISUAIS (CALENDÁRIOS, COBERTURA, FALTAS) ---
function renderizarCalendarioCriacao() {
    const grid = document.getElementById('calendario-criacao-grid'); 
    if(!grid) return;
    grid.innerHTML = ''; 
    if(document.getElementById('painel-atribuicao')) document.getElementById('painel-atribuicao').style.display = 'none'; 
    diaSelecionadoCriacao = null;
    
    const filtroInput = document.getElementById('escala-mes-ano');
    if(!filtroInput) return;
    const filtro = filtroInput.value; if(!filtro) return;
    
    if(document.getElementById('calendario-criacao-container')) document.getElementById('calendario-criacao-container').style.display = 'block';
    const [ano, mesStr] = filtro.split('-'); const mes = parseInt(mesStr) - 1;
    const totalDias = new Date(ano, mes + 1, 0).getDate(); const offsetSemanas = new Date(ano, mes, 1).getDay();
    for (let i = 0; i < offsetSemanas; i++) { const d = document.createElement('div'); d.classList.add('dia', 'dia-vazio'); grid.appendChild(d); }
    for (let dia = 1; dia <= totalDias; dia++) {
        const div = document.createElement('div'); div.classList.add('dia'); div.innerText = dia;
        const dataStr = `${ano}-${mesStr}-${dia.toString().padStart(2, '0')}`;
        if(new Date(ano, mes, dia).getDay() === 0 || new Date(ano, mes, dia).getDay() === 6) div.classList.add('fim-semana');
        div.onclick = () => selecionarDiaParaEscalar(dataStr, div); grid.appendChild(div);
    }
}
function selecionarDiaParaEscalar(dataStr, elementoDiv) {
    document.querySelectorAll('#calendario-criacao-grid .dia').forEach(d => d.classList.remove('selecionado'));
    elementoDiv.classList.add('selecionado'); diaSelecionadoCriacao = dataStr;
    const [ano, mes, dia] = dataStr.split('-'); 
    if(document.getElementById('titulo-atribuicao-dia')) document.getElementById('titulo-atribuicao-dia').innerText = `Ajustar Escala: ${dia}/${mes}/${ano}`;
    const select = document.getElementById('atribuir-func-select'); 
    if(select){
        select.innerHTML = '<option value="">-- Selecione o Colaborador --</option>';
        appDados.funcionarios.forEach(f => select.innerHTML += `<option value="${f.id}">${f.nome} [Grupo ${f.grupo}]</option>`);
    }
    if(document.getElementById('painel-atribuicao')) document.getElementById('painel-atribuicao').style.display = 'block'; 
    atualizarListaAtribuidosDoDia();
}
function atualizarListaAtribuidosDoDia() {
    const container = document.getElementById('lista-atribuídos-dia'); 
    if(!container) return;
    container.innerHTML = '<strong>Alterações fixadas hoje:</strong><br>';
    const alocados = appDados.escalas[diaSelecionadoCriacao];
    if(!alocados || Object.keys(alocados).length === 0) return container.innerHTML += '<em style="font-size:13px; opacity:0.6;">Nenhuma troca manual.</em>';
    for(let id in alocados) {
        const func = appDados.funcionarios.find(f => f.id === id); const a = alocados[id];
        if(func) { const txt = a.trabalha ? `${a.entrada} às ${a.saida}` : `<span style="color:var(--erro)">FOLGA MANUAL</span>`; container.innerHTML += `<div style="font-size:14px; margin-top:5px;">• ${func.nome}: <strong>${txt}</strong></div>`; }
    }
}

const formAtribuir = document.getElementById('form-atribuir-escala');
if (formAtribuir) {
    formAtribuir.addEventListener('submit', function(e) {
        e.preventDefault(); 
        const funcId = document.getElementById('atribuir-func-select').value; 
        const entrada = document.getElementById('atribuir-entrada').value; 
        const saida = document.getElementById('atribuir-saida').value; 
        
        const chk = document.getElementById('atribuir-folga-checkbox');
        const isFolga = chk ? chk.checked : false;
        
        const aIni = document.getElementById('atribuir-almoco-inicio') ? document.getElementById('atribuir-almoco-inicio').value : '12:00';
        const aFim = document.getElementById('atribuir-almoco-fim') ? document.getElementById('atribuir-almoco-fim').value : '13:00';

        if(!funcId || !diaSelecionadoCriacao) return; const func = appDados.funcionarios.find(f => f.id === funcId);
        if(!isFolga && (!entrada || !saida)) return alert('Preencha os horários ou selecione folga.');
        const validacao = validarRegrasDeTroca(func, diaSelecionadoCriacao, entrada, saida, isFolga);
        if (!validacao.aprovado) return alert("❌ BLOQUEIO:\n" + validacao.erro);
        if(!appDados.escalas[diaSelecionadoCriacao]) appDados.escalas[diaSelecionadoCriacao] = {};
        appDados.escalas[diaSelecionadoCriacao][funcId] = { trabalha: !isFolga, entrada: entrada, saida: saida, almocoInicio: aIni, almocoFim: aFim };
        salvarTodosDados(); alert('Escala alterada!'); this.reset(); atualizarListaAtribuidosDoDia();
    });
}

function renderizarCoberturaHora() {
    const dataInputObj = document.getElementById('cobertura-data');
    if(!dataInputObj) return;
    const dataInput = dataInputObj.value; 
    const container = document.getElementById('cobertura-resultado');
    if (!container || !dataInput) return;
    let html = `<h3>Volumetria: ${dataInput.split('-').reverse().join('/')}</h3><br><table><thead><tr><th>Horário</th><th>Headcount Ativo</th><th>Status</th></tr></thead><tbody>`;
    for (let h = 0; h < 24; h++) {
        const qtd = calcularCoberturaHoraEspecifica(dataInput, h); const horaFormatada = h.toString().padStart(2, '0') + ':00';
        let statusTexto = '✔ Estável'; let styleLinha = '';
        if ((h === 6 || h === 23) && qtd < 2) { statusTexto = '❌ VERMELHO: RISCO'; styleLinha = 'style="background-color: var(--erro); color: white; font-weight: bold;"'; } 
        else if (qtd === 0) { statusTexto = '⚠ Zero Cobertura'; styleLinha = 'style="opacity: 0.5;"'; }
        html += `<tr ${styleLinha}><td>${horaFormatada}</td><td><strong>${qtd} Técnico(s)</strong></td><td>${statusTexto}</td></tr>`;
    }
    container.innerHTML = html + '</tbody></table>';
}
function aoMudarMesAnoLista() { renderizarCalendarioLista(); }
function renderizarCalendarioLista() {
    const grid = document.getElementById('calendario-lista-grid'); 
    if(!grid) return;
    grid.innerHTML = ''; 
    if(document.getElementById('detalhes-dia-container')) document.getElementById('detalhes-dia-container').style.display = 'none';
    const filtroInput = document.getElementById('filtro-mes-ano');
    if(!filtroInput) return;
    const filtro = filtroInput.value; if(!filtro) return;
    
    const [ano, mesStr] = filtro.split('-'); const mesIdx = parseInt(mesStr) - 1; const dataAux = new Date(ano, mesIdx, 1);
    if(document.getElementById('calendario-lista-titulo')) document.getElementById('calendario-lista-titulo').innerText = `${dataAux.toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} / ${ano}`;
    if(document.getElementById('calendario-lista-container')) document.getElementById('calendario-lista-container').style.display = 'block';
    const totalDias = new Date(ano, mesIdx + 1, 0).getDate(); const offsetSemanas = dataAux.getDay();
    for (let i = 0; i < offsetSemanas; i++) { const d = document.createElement('div'); d.classList.add('dia', 'dia-vazio'); grid.appendChild(d); }
    for (let dia = 1; dia <= totalDias; dia++) {
        const div = document.createElement('div'); div.classList.add('dia'); div.innerText = dia; const dataStr = `${ano}-${mesStr}-${dia.toString().padStart(2, '0')}`;
        if(new Date(ano, mesIdx, dia).getDay() === 0 || new Date(ano, mesIdx, dia).getDay() === 6) div.classList.add('fim-semana');
        div.onclick = () => exibirTrabalhadoresDoDia(dataStr, div); grid.appendChild(div);
    }
}
function exibirTrabalhadoresDoDia(dataStr, elementoDiv) {
    document.querySelectorAll('#calendario-lista-grid .dia').forEach(d => d.classList.remove('selecionado')); if(elementoDiv) elementoDiv.classList.add('selecionado');
    dataSelecionadaLista = dataStr; const [ano, mes, dia] = dataStr.split('-'); 
    if(document.getElementById('detalhes-dia-titulo')) document.getElementById('detalhes-dia-titulo').innerText = `Quadro Ativo no Turno: ${dia}/${mes}/${ano}`;
    if(document.getElementById('filtro-tabela-dia')) document.getElementById('filtro-tabela-dia').value = ''; 
    if(document.getElementById('detalhes-dia-container')) document.getElementById('detalhes-dia-container').style.display = 'block'; 
    renderizarTabelaDia();
}
function renderizarTabelaDia() {
    if (!dataSelecionadaLista) return;
    
    const inputFiltro = document.getElementById('filtro-tabela-dia');
    const selectOrdena = document.getElementById('ordenar-tabela-dia');
    const termoBusca = inputFiltro ? inputFiltro.value.toLowerCase() : ''; 
    const tipoOrdenacao = selectOrdena ? selectOrdena.value : 'grupo';
    
    const tbody = document.querySelector('#tabela-funcionarios-dia tbody'); 
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let funcionariosFiltrados = appDados.funcionarios.filter(f => { return f.nome.toLowerCase().includes(termoBusca) || f.id.toLowerCase().includes(termoBusca); });
    funcionariosFiltrados.sort((a, b) => {
        if (tipoOrdenacao === 'grupo') { if (a.grupo === b.grupo) return a.nome.localeCompare(b.nome); return a.grupo.localeCompare(b.grupo); }
        if (tipoOrdenacao === 'nome') return a.nome.localeCompare(b.nome);
        if (tipoOrdenacao === 'id_asc') { const idA = parseInt(a.id); const idB = parseInt(b.id); if (!isNaN(idA) && !isNaN(idB)) return idA - idB; return a.id.localeCompare(b.id); }
        if (tipoOrdenacao === 'id_desc') { const idA = parseInt(a.id); const idB = parseInt(b.id); if (!isNaN(idA) && !isNaN(idB)) return idB - idA; return b.id.localeCompare(a.id); }
        if (tipoOrdenacao === 'status') {
            const infoA = obterStatusDiaColaborador(a, dataSelecionadaLista); const infoB = obterStatusDiaColaborador(b, dataSelecionadaLista);
            const pesos = { 'trabalho': 1, 'falta': 2, 'folga': 3 }; const pesoA = pesos[infoA.status] || 4; const pesoB = pesos[infoB.status] || 4;
            if (pesoA !== pesoB) return pesoA - pesoB; if (a.grupo === b.grupo) return a.nome.localeCompare(b.nome); return a.grupo.localeCompare(b.grupo);
        } return 0;
    });
    funcionariosFiltrados.forEach(f => {
        const info = obterStatusDiaColaborador(f, dataSelecionadaLista); const tr = document.createElement('tr'); let visual = '';
        if(info.status === 'trabalho') visual = `<span style="color:var(--dourado); font-weight:bold;">${info.detalhe}</span>`;
        else if(info.status === 'falta') visual = `<span style="color:var(--erro); font-weight:bold;">${info.detalhe}</span>`; else visual = `<span style="opacity:0.6;">${info.detalhe}</span>`;
        tr.innerHTML = `<td>${f.id}</td><td><strong>${f.nome}</strong></td><td>Grupo ${f.grupo}</td><td>${visual}</td>`; tbody.appendChild(tr);
    });
}

const buscaFuncObj = document.getElementById('busca-func');
if (buscaFuncObj) {
    buscaFuncObj.addEventListener('input', function() {
        const termo = this.value.toLowerCase(); const ul = document.getElementById('resultado-busca'); ul.innerHTML = ''; if (!termo) return;
        appDados.funcionarios.filter(f => f.nome.toLowerCase().includes(termo) || f.id.includes(termo)).forEach(func => {
            const li = document.createElement('li'); li.innerText = `${func.nome} (ID: ${func.id})`;
            li.onclick = () => { document.getElementById('busca-func').value = func.nome; document.getElementById('falta-id-selecionado').value = func.id; ul.innerHTML = ''; }; ul.appendChild(li);
        });
    });
}

const formFaltaObj = document.getElementById('form-falta');
if (formFaltaObj) {
    formFaltaObj.addEventListener('submit', function(e) {
        e.preventDefault(); const id = document.getElementById('falta-id-selecionado').value; const dataFalta = document.getElementById('data-falta').value;
        const idx = appDados.funcionarios.findIndex(f => f.id === id);
        if (idx > -1) {
            if (!appDados.funcionarios[idx].faltas) appDados.funcionarios[idx].faltas = [];
            if (!appDados.funcionarios[idx].faltas.includes(dataFalta)) { appDados.funcionarios[idx].faltas.push(dataFalta); salvarTodosDados(); alert('Falta registrada.'); this.reset(); } else alert('Falta já mapeada.');
        }
    });
}

async function exportarParaExcel() {
    const filtroInput = document.getElementById('filtro-mes-ano') || document.getElementById('escala-excel-mes');
    if(!filtroInput || !filtroInput.value) return alert('Por favor, selecione o Mês/Ano na tela antes de baixar.');
    const filtro = filtroInput.value;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EscalaApp Corporativo';
    const [ano, mesStr] = filtro.split('-');
    const totalDias = new Date(ano, parseInt(mesStr), 0).getDate();
    const dataAux = new Date(ano, parseInt(mesStr) - 1, 1);
    const tituloMesAno = `${dataAux.toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} ${ano}`;

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

    let funcionariosOrdenados = [...appDados.funcionarios].sort((a, b) => {
        if(a.grupo === b.grupo) return a.nome.localeCompare(b.nome);
        return a.grupo.localeCompare(b.grupo);
    });

    funcionariosOrdenados.forEach(f => {
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
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: coresGrupoExcel[f.grupo] ? coresGrupoExcel[f.grupo].replace('#','FF') : 'FFFFFFFF' } };
                cell.font = { bold: true };
            }

            if (colNumber > 4) {
                const valor = cell.value ? cell.value.toString() : '';
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

    sheetEscala.getColumn(1).width = 10; sheetEscala.getColumn(2).width = 30; sheetEscala.getColumn(3).width = 12; sheetEscala.getColumn(4).width = 15;
    for(let i = 5; i <= totalDias + 4; i++) sheetEscala.getColumn(i).width = 18;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `Escala_Corporativa_${mesStr}_${ano}.xlsx`; link.click();
}