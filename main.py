from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
from tensorflow.keras.models import load_model
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import pandas as pd
import datetime
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer

nltk.download('vader_lexicon', quiet=True)
sia = SentimentIntensityAnalyzer()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/history/{ticker}")
def get_history(ticker: str):
    ticker_data = yf.Ticker(ticker)
    df = ticker_data.history(period="30d")
    close_prices = df['Close']
    formatted_dates = close_prices.index.strftime('%Y-%m-%d').tolist()
    return dict(zip(formatted_dates, close_prices.tolist()))

@app.get("/history_ohlc/{ticker}")
def get_history_ohlc(ticker: str):
    ticker_data = yf.Ticker(ticker)
    df = ticker_data.history(period="30d")
    df = df[['Open', 'High', 'Low', 'Close']]
    formatted_dates = df.index.strftime('%Y-%m-%d').tolist()
    result = []
    for i, date in enumerate(formatted_dates):
        result.append({
            "x": date,
            "y": [
                float(df.iloc[i]['Open']),
                float(df.iloc[i]['High']),
                float(df.iloc[i]['Low']),
                float(df.iloc[i]['Close'])
            ]
        })
    return result

@app.get("/predict/{ticker}")
def get_prediction(ticker: str):
    model = load_model('stock_lstm_model.keras')
    ticker_data = yf.Ticker(ticker)
    df = ticker_data.history(period="1y")
    close_prices = df[['Close']].values
    
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit(close_prices)
    
    last_60_days = close_prices[-60:]
    current_window = scaler.transform(last_60_days).reshape((1, 60, 1))
    
    scaled_predictions = []
    
    for _ in range(7):
        pred = model.predict(current_window)
        scaled_predictions.append(pred[0][0])
        current_window = np.append(current_window[:, 1:, :], [[[pred[0][0]]]], axis=1)
        
    scaled_predictions_arr = np.array(scaled_predictions).reshape(-1, 1)
    real_predictions = scaler.inverse_transform(scaled_predictions_arr)
    
    last_date = df.index[-1]
    future_dates = []
    days_added = 0
    current_date = last_date
    while days_added < 7:
        current_date += datetime.timedelta(days=1)
        if current_date.weekday() < 5:
            future_dates.append(current_date.strftime('%Y-%m-%d'))
            days_added += 1
            
    predictions_output = []
    for i in range(7):
        predictions_output.append({
            "date": future_dates[i],
            "price": float(real_predictions[i][0])
        })
    
    return {"ticker": ticker, "predictions": predictions_output}

@app.get("/sentiment/{ticker}")
def get_sentiment(ticker: str):
    ticker_data = yf.Ticker(ticker)
    news_items = ticker_data.news
    if not news_items:
        return {"ticker": ticker, "status": "Neutral", "score": 0.0}
    
    total_score = 0.0
    for item in news_items:
        content = item.get('content', {})
        title = content.get('title', '')
        score = sia.polarity_scores(title)['compound']
        total_score += score
        
    avg_score = total_score / len(news_items)
    
    if avg_score > 0.05:
        status = "Bullish"
    elif avg_score < -0.05:
        status = "Bearish"
    else:
        status = "Neutral"
        
    return {"ticker": ticker, "status": status, "score": float(avg_score)}
