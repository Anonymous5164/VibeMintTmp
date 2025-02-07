"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { getAllUsers } from "@/actions/user.action";
import Link from "next/link";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { debounce } from "lodash";

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<{ id: string; name: string; username: string; image: string | null }[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce search to avoid multiple API calls
  const fetchUsers = debounce(async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    const results = await getAllUsers(query);
    setUsers(results);
    setLoading(false);
  }, 300);

  useEffect(() => {
    fetchUsers(searchQuery);
  }, [searchQuery]);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          className="pl-10 pr-4 py-2 w-full border rounded-md text-sm focus:outline-none"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Search Results Dropdown */}
      {users.length > 0 && (
        <div className="absolute w-full bg-white shadow-lg border rounded-lg mt-1 z-50">
          {users.map((user) => (
            <Link key={user.id} href={`/profile/${user.username}`} className="flex items-center gap-2 p-2 hover:bg-gray-100">
              <Avatar className="size-8">
                <AvatarImage src={user.image ?? "/avatar.png"} />
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-gray-500">@{user.username}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
