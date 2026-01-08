import Chart from 'chart.js/auto';
import { masks } from '../utils/masks.js';

export class ChartManager {
    constructor() {
        this.charts = {}; // Armazena instâncias para destruir antes de recriar
    }

    renderExpenseChart(ctx, data) {
        if (this.charts['expense']) this.charts['expense'].destroy();

        if (data.length === 0) {
            // Renderiza um gráfico vazio ou placeholder se não houver dados
            return;
        }

        this.charts['expense'] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.name),
                datasets: [{
                    data: data.map(d => d.total),
                    backgroundColor: data.map(d => d.color),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'right' },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const val = context.raw;
                                return ` ${masks.formatCurrency(val)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderEvolutionChart(ctx, data) {
        if (this.charts['evolution']) this.charts['evolution'].destroy();

        this.charts['evolution'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => {
                    const [year, month] = d.month.split('-');
                    return `${month}/${year}`;
                }),
                datasets: [
                    {
                        label: 'Receitas',
                        data: data.map(d => d.income),
                        backgroundColor: '#16a34a',
                        borderRadius: 4
                    },
                    {
                        label: 'Despesas',
                        data: data.map(d => d.expense),
                        backgroundColor: '#dc2626',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#e5e7eb' },
                        ticks: {
                            callback: (value) => {
                                // Formatação abreviada (1k, 1M) para economizar espaço
                                if(value >= 1000) return `R$ ${value/1000}k`;
                                return value;
                            }
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }
}