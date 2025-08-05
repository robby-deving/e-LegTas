import React from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { X } from "lucide-react";
import type { EvacuationRoom, RoomType } from '../../types/evacuation';

const ROOM_TYPES: RoomType[] = [
  'Temporary',
  'Permanent',
];

interface RoomFormProps {
  rooms: EvacuationRoom[];
  onAddRoom: () => void;
  onRoomChange: (roomId: string, field: string, value: string | number) => void;
  onDeleteRoom: (roomId: string) => void;
  errors?: Record<string, Partial<Record<keyof EvacuationRoom, string>>>;
}

export function RoomForm({ rooms, onAddRoom, onRoomChange, onDeleteRoom, errors }: RoomFormProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">Evacuation Rooms</label>
        <Button
          type="button"
          onClick={onAddRoom}
          className="bg-green-700 hover:bg-green-800 text-white px-3 text-xs h-7"
        >
          + Add Room
        </Button>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
        {rooms.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-8">
            No rooms added yet. Click "Add Room" to get started.
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-end mb-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteRoom(room.id)}
                  className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Room Name *</label>
                  <Input
                    placeholder="Room Name"
                    value={room.roomName}
                    onChange={(e) => onRoomChange(room.id, 'roomName', e.target.value)}
                    className={`text-sm ${errors?.[room.id]?.roomName ? 'border-red-500' : ''}`}
                  />
                  {errors?.[room.id]?.roomName && (
                    <p className="text-red-500 text-xs mt-1">{errors[room.id].roomName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Type *</label>
                  <Select 
                    value={room.type} 
                    onValueChange={(value) => onRoomChange(room.id, 'type', value)}
                  >
                    <SelectTrigger className={`text-sm w-full ${errors?.[room.id]?.type ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors?.[room.id]?.type && (
                    <p className="text-red-500 text-xs mt-1">{errors[room.id].type}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Capacity *</label>
                  <Input
                    placeholder="0"
                    type="number"
                    min="0"
                    value={room.capacity || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      onRoomChange(room.id, 'capacity', value === '' ? 0 : parseInt(value) || 0);
                    }}
                    className={`text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors?.[room.id]?.capacity ? 'border-red-500' : ''}`}
                  />
                  {errors?.[room.id]?.capacity && (
                    <p className="text-red-500 text-xs mt-1">{errors[room.id].capacity}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}