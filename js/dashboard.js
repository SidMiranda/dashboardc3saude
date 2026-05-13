document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Protection
    const token = sessionStorage.getItem('c3_auth_token');
    
    // Check if we are on dashboard (handles direct file opening too)
    const isDashboard = window.location.pathname.includes('dashboard') || 
                        (!window.location.pathname.includes('index.html') && window.location.pathname.endsWith('/'));
    
    if (!token && isDashboard) {
        window.location.href = 'index.html';
        return;
    }

    // Logout Event
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('c3_auth_token');
            window.location.href = 'index.html';
        });
    }

    // Mobile Sidebar Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggleSidebar');

    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
    }

    if (toggleSidebarBtn && sidebar) {
        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // 2. Fetch Data & Render
    if (typeof window.apiService !== 'undefined') {
        try {
            const data = await window.apiService.fetchAtestados();
            processDataAndRender(data);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
        } finally {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.classList.add('fade-out');
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 500); // Aguarda a transição CSS de opacidade terminar
            }
        }
    }
});

function processDataAndRender(payload) {
    // --- Data Processing logic ---
    // Checa se os dados vieram no novo formato {kpis, atestados} ou no formato antigo []
    const isNewFormat = payload.atestados !== undefined;
    const data = isNewFormat ? payload.atestados : payload;

    // KPIs usando aba Gerencial ou fallback matemático
    const totalAtestados = (isNewFormat && payload.kpis) ? (payload.kpis.total || 0) : data.length;
    // O fallback || 0 evita que um valor undefined se torne NaN na animação
    const totalLancados = (isNewFormat && payload.kpis) ? (payload.kpis.lancados || payload.kpis.processados || 0) : 2264;
    
    const uniqueCids = new Set(data.map(item => item.cid).filter(Boolean)).size;
    const uniqueColabs = new Set(data.map(item => item.colaborador).filter(Boolean)).size;

    // Group by Day (Timeline Dinâmica)
    const timelineMap = {};
    data.forEach(item => {
        const dateStr = item.data;
        if (dateStr) {
            timelineMap[dateStr] = (timelineMap[dateStr] || 0) + 1;
        }
    });
    
    // Ordenar datas
    const sortedDates = Object.keys(timelineMap).sort();
    const timelineCategories = sortedDates.map(d => {
        const parts = d.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d; // Formato DD/MM
    });
    const timelineSeriesData = sortedDates.map(d => timelineMap[d]);

    // Group by CID
    const cidMap = {};
    data.forEach(item => {
        if (!item.cid) return;
        cidMap[item.cid] = (cidMap[item.cid] || 0) + 1;
    });
    const sortedCids = Object.entries(cidMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Get Top 10
    const cidCategories = sortedCids.map(item => item[0]);
    const cidSeriesData = sortedCids.map(item => item[1]);

    // Group by Colaborador
    const colabMap = {};
    data.forEach(item => {
        if (!item.colaborador) return;
        if (!colabMap[item.colaborador]) {
            colabMap[item.colaborador] = { dias: 0, atestados: 0 };
        }
        colabMap[item.colaborador].dias += (item.diasAfastados || 0);
        colabMap[item.colaborador].atestados += 1;
    });
    const sortedColabs = Object.entries(colabMap)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.dias - a.dias)
        .slice(0, 10);

    // --- DOM Updates ---
    
    // Animate KPI counters
    animateValue("kpiTotal", 0, totalAtestados, 1000);
    animateValue("kpiLancados", 0, totalLancados, 1000);
    animateValue("kpiCids", 0, uniqueCids, 1000);
    animateValue("kpiColabs", 0, uniqueColabs, 1000);

    // Render Bottom Table
    const tbody = document.getElementById('topColabsTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        const maxDias = sortedColabs.length > 0 ? sortedColabs[0].dias : 1;

        sortedColabs.forEach((colab, index) => {
            const progressPercent = (colab.dias / maxDias) * 100;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${index + 1}</td>
                <td><strong>${colab.name}</strong></td>
                <td>${colab.dias}</td>
                <td>${colab.atestados}</td>
                <td>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${progressPercent}%"></div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- ApexCharts Rendering ---
    
    // Theme base options for ApexCharts
    const chartOptionsBase = {
        chart: {
            foreColor: '#EADEDA',
            toolbar: { show: false },
            background: 'transparent',
            fontFamily: 'Space Grotesk, sans-serif'
        },
        theme: { mode: 'dark' },
        grid: {
            borderColor: 'rgba(234, 222, 218, 0.1)',
            strokeDashArray: 4
        },
        tooltip: {
            theme: 'dark',
            style: {
                fontSize: '14px',
                fontFamily: 'Space Grotesk, sans-serif'
            }
        }
    };

    // Timeline Chart config
    const timelineOptions = {
        ...chartOptionsBase,
        series: [{
            name: 'Atestados',
            data: timelineSeriesData
        }],
        chart: {
            ...chartOptionsBase.chart,
            type: 'area',
            height: 300,
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
            }
        },
        colors: ['#169aa7'],
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.1,
                stops: [0, 90, 100]
            }
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        xaxis: {
            categories: timelineCategories,
            title: { text: 'Dias', style: { color: '#a0a09e' } }
        },
        yaxis: {
            title: { text: 'Qtd Atestados', style: { color: '#a0a09e' } },
            min: 0
        }
    };

    // CID Chart config
    const cidOptions = {
        ...chartOptionsBase,
        series: [{
            name: 'Ocorrências',
            data: cidSeriesData
        }],
        chart: {
            ...chartOptionsBase.chart,
            type: 'bar',
            height: 300,
        },
        colors: ['#591397'],
        plotOptions: {
            bar: {
                horizontal: true,
                borderRadius: 4,
                dataLabels: { position: 'top' }
            }
        },
        dataLabels: {
            enabled: true,
            offsetX: 20,
            style: { fontSize: '12px', colors: ['#EADEDA'] }
        },
        xaxis: {
            categories: cidCategories,
        }
    };

    new ApexCharts(document.querySelector("#timelineChart"), timelineOptions).render();
    new ApexCharts(document.querySelector("#cidChart"), cidOptions).render();
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}
