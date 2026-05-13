class ApiService {
    constructor() {
        // ⚠️ PASSO 2: Cole aqui a URL que o Google Apps Script vai gerar para você
        this.endpointUrl = 'https://script.google.com/macros/s/AKfycbzl85kl2OJCubCWvFUjhKAvfiiRxn28gJDYxtaLANnEV4v87n6lU-E2qmNOjR74y09L4Q/exec'
    }

    async fetchAtestados() {
        const CACHE_KEY = 'c3_dados_atestados';
        const CACHE_TIME_KEY = 'c3_dados_timestamp';
        const UMA_HORA_EM_MS = 3600000; // 60 minutos * 60 segundos * 1000 milissegundos

        const cachedData = localStorage.getItem(CACHE_KEY);
        const cacheTime = localStorage.getItem(CACHE_TIME_KEY);

        // 1. Verifica se existe cache e se ele tem menos de 1 hora
        if (cachedData && cacheTime) {
            const agora = new Date().getTime();
            const diferenca = agora - parseInt(cacheTime, 10);
            
            if (diferenca < UMA_HORA_EM_MS) {
                console.log("Carregando dados do Cache Local (Instantâneo)");
                return JSON.parse(cachedData);
            }
        }

        // Se a URL estiver vazia, usa os dados falsos para não quebrar a tela
        if (!this.endpointUrl || this.endpointUrl === '') {
            console.warn("URL da API não configurada. Mostrando dados de teste (Mock).");
            return this._generateMockData();
        }

        try {
            console.log("Buscando dados novos da Planilha...");
            // Faz a requisição na sua planilha do Google via Apps Script
            const response = await fetch(this.endpointUrl);
            if (!response.ok) throw new Error('Falha na rede ao tentar buscar a planilha');
            
            const data = await response.json();
            
            // 2. Salva o resultado no Cache Local com o timestamp atual
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CACHE_TIME_KEY, new Date().getTime().toString());
            
            return data;
            
        } catch (error) {
            console.error("Erro ao buscar dados reais da planilha:", error);
            
            // 3. Em caso de queda de internet ou erro, tenta usar o cache mesmo se estiver vencido
            if (cachedData) {
                console.warn("Retornando cache vencido devido a erro de conexão.");
                return JSON.parse(cachedData);
            }
            return [];
        }
    }

    // Função de dados de teste (fallback) mantida até você plugar a sua URL oficial
    _generateMockData() {
        const atestados = [];
        const colaboradores = [
            'Ana Silva', 'Bruno Costa', 'Carlos Pereira', 'Diana Souza', 
            'Eduardo Lima', 'Fernanda Alves', 'Gabriel Rocha', 'Helena Dias', 
            'Igor Santos', 'Julia Mendes', 'Kleber Nunes', 'Larissa Gomes'
        ];
        const cids = ['J01.9 (Sinusite)', 'J11 (Gripe)', 'M54.5 (Dor lombar)', 'A09 (Diarreia)', 'F41.1 (Ansiedade)'];

        for (let i = 0; i < 100; i++) {
            const day = Math.floor(Math.random() * 30) + 1;
            const date = `2026-04-${day.toString().padStart(2, '0')}`;
            atestados.push({
                data: date,
                cid: cids[Math.floor(Math.random() * cids.length)],
                colaborador: colaboradores[Math.floor(Math.random() * colaboradores.length)],
                diasAfastados: Math.floor(Math.random() * 15) + 1
            });
        }
        
        atestados.sort((a, b) => new Date(a.data) - new Date(b.data));

        return {
            kpis: {
                total: 2874,
                lancados: 2264
            },
            atestados: atestados
        };
    }
}

// Export as global for access
window.apiService = new ApiService();
