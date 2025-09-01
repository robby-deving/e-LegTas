import axios from "axios";
import type { Disaster, DisasterPayload, DisasterTypeWithId } from "@/types/disaster";

interface DisasterApiResponse {
  data: any[];
  message: string;
  count?: number;
}

interface DisasterTypesApiResponse {
  data: any[];
  message: string;
  count?: number;
}

interface EvacuationCenterResponse {
  evacuation_center_id: number;
}

class DisasterService {
  private baseUrl = "/api/v1";

  async fetchDisastersByMonthYear(
    month: number | null,
    year: number,
    token: string
  ): Promise<Disaster[]> {
    try {
      const params = new URLSearchParams();
      if (month !== null) {
        params.append("month", month.toString());
      }
      params.append("year", year.toString());

      const response = await axios.get<DisasterApiResponse>(
        `${this.baseUrl}/disasters?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const transformed: Disaster[] = response.data.data.map((item: any) => ({
        id: item.id,
        name: item.disaster_name,
        type: String(item.disaster_type_name),
        type_id: item.disaster_type_id,
        start_date: item.disaster_start_date,
        end_date: item.disaster_end_date,
        status: item.disaster_end_date ? "Ended" : "Active",
      }));

      return transformed;
    } catch (error) {
      console.error("Failed to fetch disasters by month/year:", error);
      throw error;
    }
  }

  async fetchAllDisasterTypes(token: string): Promise<DisasterTypeWithId[]> {
    try {
      const response = await axios.get<DisasterTypesApiResponse>(
        `${this.baseUrl}/disasters/types`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const typesWithId: DisasterTypeWithId[] = response.data.data.map(
        (item: any) => ({
          id: item.id,
          name: item.name,
        })
      );

      return typesWithId;
    } catch (error) {
      console.error("Failed to fetch disaster types:", error);
      throw error;
    }
  }
  async createDisaster(disasterData: DisasterPayload, token: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/disasters`, disasterData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to create disaster:", error);
      throw error;
    }
  }

  async fetchDisasterById(disasterId: number, token: string): Promise<Disaster> {
    try {
      const response = await axios.get<DisasterApiResponse>(
        `${this.baseUrl}/disasters/${disasterId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const item = response.data.data as any;
      const transformed: Disaster = {
        id: item.id,
        name: item.disaster_name,
        type: String(item.disaster_type_name),
        type_id: item.disaster_type_id,
        start_date: item.disaster_start_date,
        end_date: item.disaster_end_date,
        status: item.disaster_end_date ? "Ended" : "Active",
      };

      return transformed;
    } catch (error) {
      console.error("Failed to fetch disaster by ID:", error);
      throw error;
    }
  }

  async updateDisaster(
    disasterId: number,
    disasterData: DisasterPayload,
    token: string
  ): Promise<void> {
    try {
      await axios.put(`${this.baseUrl}/disasters/${disasterId}`, disasterData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to update disaster:", error);
      throw error;
    }
  }

  async deleteDisaster(disasterId: number, token: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/disasters/${disasterId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to delete disaster:", error);
      throw error;
    }
  }

  async fetchAssignedEvacuationCenter(userId: number, token: string): Promise<number | null> {
    try {
      const response = await axios.get<EvacuationCenterResponse>(
        `${this.baseUrl}/evacuation-centers/user/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data && response.data.evacuation_center_id) {
        return response.data.evacuation_center_id;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch assigned evacuation center:", error);
      throw error;
    }
  }
}

export const disasterService = new DisasterService();