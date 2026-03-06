import data_processor
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dropout, Dense
import tensorflow as tf

def build_and_train_model():
    scaled_data, _ = data_processor.fetch_and_process_data()
    X, y = data_processor.create_sequences(scaled_data)
    X_train, X_test, y_train, y_test = data_processor.split_data(X, y)
    
    model = Sequential()
    model.add(LSTM(units=50, return_sequences=True, input_shape=(X_train.shape[1], 1)))
    model.add(Dropout(0.2))
    model.add(LSTM(units=50, return_sequences=False))
    model.add(Dropout(0.2))
    model.add(Dense(units=1))
    
    model.compile(optimizer='adam', loss='mean_squared_error')
    
    model.fit(X_train, y_train, epochs=20, batch_size=32, validation_data=(X_test, y_test))
    
    model.save('stock_lstm_model.keras')

if __name__ == "__main__":
    build_and_train_model()
