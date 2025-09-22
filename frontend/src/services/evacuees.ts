// src/services/evacuees.ts
import axios from "axios";
import type { EvacuationCenterDetail, EvacueeStatistics, FamilyEvacueeInformation, EditEvacueeApi, RegisterEvacuee, Evacuee, FamilyHeadResult } from "@/types/EvacuationCenterDetails";

const API = "/api/v1";

const auth = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

export const evacueesApi = {
  getDetails: (centerId: number, token: string) =>
    axios.get<EvacuationCenterDetail>(`${API}/evacuees/${centerId}/details`, auth(token)),

  getStatistics: (centerId: number, token: string) =>
    axios.get<EvacueeStatistics>(`${API}/evacuees/${centerId}/evacuee-statistics`, auth(token)),

  getEvacueesInformation: (centerId: number, token: string) =>
    axios.get<FamilyEvacueeInformation[]>(
      `${API}/evacuees/${centerId}/evacuees-information`,
      auth(token)
    ),

  searchEvacuees: (name: string, token: string) =>
    axios.get<Evacuee[]>(`${API}/evacuees/search`, {
      ...auth(token),
      params: { name },
    }),

  getUndecampedCount: (centerId: number, token: string) =>
    axios.get<{ count: number }>(`${API}/evacuees/${centerId}/undecamped-count`, auth(token)),

  decampAll: (centerId: number, isoTs: string, token: string) =>
    axios.post(
      `${API}/evacuees/${centerId}/decamp-all`,
      { decampment_timestamp: isoTs },
      auth(token)
    ),

  endEvacuation: (centerId: number, isoTs: string, token: string) =>
    axios.post(
      `${API}/evacuees/${centerId}/end`,
      { evacuation_end_date: isoTs },
      auth(token)
    ),

  getFamilyHeads: (centerId: number, q: string, token: string) =>
    axios.get<{ data: FamilyHeadResult[] }>(
      `${API}/evacuees/${centerId}/family-heads`,
      { ...auth(token), params: { q } }
    ),

  getEditEvacuee: (centerId: number, evacueeResidentId: number, token: string) =>
    axios.get<EditEvacueeApi>(
      `${API}/evacuees/${centerId}/${evacueeResidentId}/edit`,
      auth(token)
    ),

  postEvacuee: (payload: RegisterEvacuee, token: string) =>
    axios.post(`${API}/evacuees`, payload, auth(token)),

  putEvacuee: (id: number, payload: RegisterEvacuee, token: string) =>
    axios.put(`${API}/evacuees/${id}`, payload, auth(token)),
};
