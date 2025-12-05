import { Input } from "./ui/input";
import { X } from "lucide-react";
import LoadingSpinner from "./loadingSpinner";
import searchIcon from "../assets/search.svg";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  isSearching?: boolean;
  className?: string;
}

export default function SearchBar({
  searchTerm,
  onSearchChange,
  placeholder = "Search",
  isSearching = false,
  className = "max-w-fit w-full",
}: SearchBarProps) {
  const handleClear = () => {
    onSearchChange("");
  };

  return (
    <div className={`relative ${className}`}>
      <img
        src={searchIcon}
        alt="Search"
        className="absolute left-3 top-1/2 transform -translate-y-1/2 z-50 cursor-pointer"
      />
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10 pr-10 py-2 bg-white/95 backdrop-blur-sm border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent rounded-lg"
      />
      {searchTerm && !isSearching && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer z-50"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {isSearching && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-50">
          <LoadingSpinner size="sm" />
        </div>
      )}
    </div>
  );
}
