import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = "Search restaurants..." }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    if (newQuery === '') {
      onSearch(''); // Trigger search with empty string when cleared
    }
  };

  const handleBlur = () => {
    if (query === '') {
      onSearch(''); // Ensure search is triggered with empty string on blur
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm items-center space-x-2">
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        onBlur={handleBlur}
        className="flex-1"
      />
      <Button type="submit" size="icon">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}