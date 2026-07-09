import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { graphApi } from './store/apiSlice';
import { Dashboard } from './components/Dashboard';

// Configure a localized Redux store instance for our asset framework
const store = configureStore({
  reducer: {
    [graphApi.reducerPath]: graphApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(graphApi.middleware),
});

export default function App() {
  return (
    <Provider store={store}>
      <Dashboard />
    </Provider>
  );
}
