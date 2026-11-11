import { PayloadAction, createSlice } from '@reduxjs/toolkit';

import { normalizeOneBotConfig } from '@/utils/config';

import type { RootState } from '@/store';

interface ConfigState {
  value: OneBotConfig;
}

const initialState: ConfigState = {
  value: normalizeOneBotConfig(),
};

export const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    updateConfig: (state, action: PayloadAction<OneBotConfig>) => {
      // 后端返回的配置可能缺少部分 network 字段（版本差异 / 首次启动），
      // 统一归一化，避免页面在 `.map` 处崩溃
      state.value = normalizeOneBotConfig(action.payload);
    },
  },
});

export const { updateConfig } = configSlice.actions;

export const selectCount = (state: RootState) => state.config.value;

export default configSlice.reducer;
