import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { AssetGraph } from '../types';
import { CompressionService } from '../services/compression';

export const graphApi = createApi({
  reducerPath: 'graphApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  endpoints: (builder) => ({
    // Query to fetch the entire machinery and layout network graph
    getAssetGraph: builder.query<AssetGraph, void>({
      query: () => 'graph',
    }),
    
    // Mutation to update an asset's data specs payload with client-side compression
    updateNodePayload: builder.mutation<void, { id: string; rawPayload: object }>({
      query: ({ id, rawPayload }) => ({
        url: `node/${id}`,
        method: 'PATCH',
        body: {
          compressedPayload: CompressionService.compress(rawPayload)
        },
      }),
    }),
  }),
});

export const { useGetAssetGraphQuery, useUpdateNodePayloadMutation } = graphApi;
