import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler

def fetch_and_process_data(ticker="AAPL"):
    ticker_data = yf.Ticker(ticker)
    df = ticker_data.history(period="5y")
    close_prices = df[['Close']].values
    
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(close_prices)
    return scaled_data, scaler

def create_sequences(data, window_size=60):
    X = []
    y = []
    for i in range(window_size, len(data)):
        X.append(data[i-window_size:i, 0])
        y.append(data[i, 0])
    return np.array(X), np.array(y)

def split_data(X, y, train_ratio=0.8):
    split_index = int(len(X) * train_ratio)
    X_train = X[:split_index]
    y_train = y[:split_index]
    X_test = X[split_index:]
    y_test = y[split_index:]
    return X_train, X_test, y_train, y_test

def main():
    scaled_data, scaler = fetch_and_process_data()
    X, y = create_sequences(scaled_data)
    X_train, X_test, y_train, y_test = split_data(X, y)
    print(X_train.shape, X_test.shape, y_train.shape, y_test.shape)

if __name__ == "__main__":
    main()
