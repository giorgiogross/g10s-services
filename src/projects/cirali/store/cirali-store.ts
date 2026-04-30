import { create } from "zustand";

export interface StateCirali {}

export const useCiraliStore = create<StateCirali>(() => ({}));
