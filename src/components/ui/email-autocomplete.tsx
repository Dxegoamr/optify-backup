import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, User, Calendar } from 'lucide-react';
import { searchUsersByEmail, UserSearchResult } from '@/core/services/user-search.service';

interface EmailAutocompleteProps {
  placeholder?: string;
  onUserSelect: (user: UserSearchResult) => void;
  onSearch?: (email: string) => void;
  disabled?: boolean;
  className?: string;
}

export const EmailAutocomplete: React.FC<EmailAutocompleteProps> = ({
  placeholder = "Digite o email do usuário",
  onUserSelect,
  onSearch,
  disabled = false,
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchTerm.length >= 2) {
      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const results = await searchUsersByEmail(searchTerm);
          setSuggestions(results);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        } catch (error) {
          console.error('Erro ao buscar usuários:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleUserSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleUserSelect = (user: UserSearchResult) => {
    setSearchTerm(user.email);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setSuggestions([]); // Limpar sugestões
    onUserSelect(user);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleSearchClick = () => {
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay to allow click on suggestions
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
        setSuggestions([]); // Limpar sugestões
      }
    }, 150);
  };

  return (
    <div className={`relative z-[9999] ${className}`} style={{ zIndex: 999999 }}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="email"
            placeholder={placeholder}
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            disabled={disabled}
            className="pr-10"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          )}
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleSearchClick}
          disabled={disabled || isLoading}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Card 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-[99999] mt-1 max-h-60 overflow-y-auto border shadow-2xl bg-background"
          style={{ 
            zIndex: 999999,
            transform: 'translateZ(0)',
            isolation: 'isolate'
          }}
        >
          <div className="p-2">
            {suggestions.map((user, index) => (
              <div
                key={user.uid}
                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                  index === selectedIndex 
                    ? 'bg-accent' 
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => handleUserSelect(user)}
              >
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {user.email}
                    </span>
                    {user.displayName && (
                      <Badge variant="secondary" className="text-xs">
                        {user.displayName}
                      </Badge>
                    )}
                  </div>
                  
                  {user.createdAt && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Cadastrado em {user.createdAt.toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {suggestions.length === 10 && (
            <div className="px-2 py-1 text-xs text-muted-foreground border-t">
              Mostrando os primeiros 10 resultados
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default EmailAutocomplete;
