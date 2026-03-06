import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Chart from 'react-apexcharts';

function App() {
  const [ticker, setTicker] = useState('AAPL');
  const [searchInput, setSearchInput] = useState('AAPL');
  const [historyData, setHistoryData] = useState([]);
  const [predictedPrices, setPredictedPrices] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [recentSearches, setRecentSearches] = useState(['AAPL', 'TSLA', 'MSFT', 'AMZN']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPrediction = async (symbol) => {
    setLoading(true);
    setError(null);
    try {
      const [historyResponse, predictResponse, sentimentResponse] = await Promise.all([
        axios.get(`http://localhost:8000/history_ohlc/${symbol}`),
        axios.get(`http://localhost:8000/predict/${symbol}`),
        axios.get(`http://localhost:8000/sentiment/${symbol}`)
      ]);

      const formattedData = historyResponse.data.map(item => ({
        x: new Date(item.x).getTime(),
        y: item.y
      }));

      setHistoryData(formattedData);
      setPredictedPrices(predictResponse.data.predictions);
      setSentiment(sentimentResponse.data);
      setTicker(symbol);

      if (!recentSearches.includes(symbol)) {
        setRecentSearches([symbol, ...recentSearches].slice(0, 5));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction(ticker);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchPrediction(searchInput.toUpperCase());
    }
  };

  const chartOptions = {
    chart: {
      type: 'candlestick',
      background: '#1e293b',
      foreColor: '#94a3b8',
      toolbar: { show: false }
    },
    title: {
      text: `${ticker} OHLC - 30 Days`,
      align: 'left',
      style: { color: '#f8fafc', fontSize: '16px' }
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#94a3b8' } }
    },
    yaxis: {
      tooltip: { enabled: true },
      labels: {
        style: { colors: '#94a3b8' },
        formatter: (value) => `$${value.toFixed(2)}`
      }
    },
    plotOptions: {
      candlestick: {
        colors: { upward: '#10b981', downward: '#ef4444' }
      }
    },
    grid: { borderColor: '#334155' },
    tooltip: { theme: 'dark' }
  };

  const predictionSeriesData = [];
  if (predictedPrices.length > 0 && historyData.length > 0) {
    const lastHistorical = historyData[historyData.length - 1];
    predictionSeriesData.push({
      x: lastHistorical.x,
      y: lastHistorical.y[3]
    });
    predictedPrices.forEach(p => {
      predictionSeriesData.push({
        x: new Date(p.date).getTime(),
        y: p.price
      });
    });
  }

  const series = [
    {
      name: 'Historical OHLC',
      type: 'candlestick',
      data: historyData
    },
    {
      name: '7-Day Forecast',
      type: 'line',
      data: predictionSeriesData,
      color: '#f59e0b',
    }
  ];

  const currentPrice = historyData.length > 0 ? historyData[historyData.length - 1].y[3] : 0;
  const finalPredictedPrice = predictedPrices.length > 0 ? predictedPrices[predictedPrices.length - 1].price : 0;
  const priceDiff = finalPredictedPrice ? finalPredictedPrice - currentPrice : 0;
  const percentChange = currentPrice ? (priceDiff / currentPrice) * 100 : 0;
  const isUptrend = priceDiff >= 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col">
      <nav className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shadow-md">
        <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
          GlobalMarkets Forecast
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search symbol..."
            className="bg-slate-700 text-slate-100 px-4 py-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500 border border-slate-600 uppercase"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-md font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </nav>

      {error ? (
        <div className="m-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          Error: {error}
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6">
          <aside className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg hidden md:block">
            <h2 className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-4">Recent Searches</h2>
            <ul className="space-y-2">
              {recentSearches.map((item, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => { setSearchInput(item); fetchPrediction(item); }}
                    className="w-full text-left px-4 py-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors flex justify-between items-center group"
                  >
                    <span className="font-semibold text-slate-200">{item}</span>
                    <span className="text-slate-500 group-hover:text-blue-400">→</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <main className="md:col-span-2 lg:col-span-3 flex flex-col gap-6">
            {predictedPrices.length > 0 && !loading && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
                  <div className="text-slate-400 text-sm font-medium mb-1">Current ({ticker})</div>
                  <div className="text-3xl font-bold text-slate-100">${currentPrice.toFixed(2)}</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
                  <div className="text-slate-400 text-sm font-medium mb-1">Predicted Next Close (Day 7)</div>
                  <div className="text-3xl font-bold text-slate-100">${finalPredictedPrice.toFixed(2)}</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
                  <div className="text-slate-400 text-sm font-medium mb-1">Expected Change</div>
                  <div className={`text-3xl font-bold flex items-center gap-2 ${isUptrend ? 'text-emerald-400' : 'text-red-400'}`}>
                    <span>{isUptrend ? '▲' : '▼'}</span>
                    <span>{Math.abs(percentChange).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-1 shadow-lg flex-1 min-h-[400px]">
              {loading || historyData.length === 0 ? (
                <div className="h-full w-full flex items-center justify-center text-slate-400 animate-pulse">
                  Loading chart data...
                </div>
              ) : (
                <div className="h-full w-full pt-4 pr-2 pb-2">
                  <Chart options={chartOptions} series={series} height="100%" />
                </div>
              )}
            </div>
          </main>

          <aside className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg flex flex-col gap-6">
            <h2 className="text-slate-100 text-lg font-bold border-b border-slate-700 pb-3">Market Metrics</h2>

            <div>
              <div className="text-slate-400 text-sm mb-1">Volume</div>
              <div className="text-xl font-semibold text-slate-200">{(Math.random() * 50 + 10).toFixed(1)}M</div>
            </div>

            <div>
              <div className="text-slate-400 text-sm mb-1">P/E Ratio</div>
              <div className="text-xl font-semibold text-slate-200">{(Math.random() * 20 + 15).toFixed(2)}</div>
            </div>

            <div>
              <div className="text-slate-400 text-sm mb-1">Market Cap</div>
              <div className="text-xl font-semibold text-slate-200">${(Math.random() * 2 + 1).toFixed(2)}T</div>
            </div>

            <div>
              <div className="text-slate-400 text-sm mb-1">52W High</div>
              <div className="text-xl font-semibold text-slate-200">${(currentPrice * 1.15).toFixed(2)}</div>
            </div>

            <div>
              <div className="text-slate-400 text-sm mb-1">52W Low</div>
              <div className="text-xl font-semibold text-slate-200">${(currentPrice * 0.75).toFixed(2)}</div>
            </div>

            {sentiment && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="text-slate-400 text-sm mb-2">Market Sentiment</div>
                <div className="flex items-center gap-3">
                  <div className={`px-4 py-2 rounded-lg font-bold text-lg ${sentiment.status === 'Bullish' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/50' :
                    sentiment.status === 'Bearish' ? 'bg-red-900/50 text-red-400 border border-red-500/50' :
                      'bg-slate-700 text-slate-300 border border-slate-600'
                    }`}>
                    {sentiment.status}
                  </div>
                  <div className="text-sm text-slate-400">
                    Score: {sentiment.score.toFixed(3)}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => alert('Detailed Report generation is a premium feature.')}
              className="mt-auto w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-colors border border-slate-600"
            >
              View Detailed Report
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;
