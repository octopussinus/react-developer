import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { themeColors } from "../../shared/utils/themeColors";

export const ThemeColorSwitcher = () => {
  const { colorTheme, setColorTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const colors = [
    { name: "blue", label: "Blue", color: themeColors.blue.brand500 },
    { name: "orange", label: "Orange", color: themeColors.orange.brand500 },
    { name: "green", label: "Green", color: themeColors.green.brand500 },
    { name: "purple", label: "Purple", color: themeColors.purple.brand500 },
  ] as const;

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const handleColorChange = (color: typeof colors[number]["name"]) => {
    setColorTheme(color);
    closeDropdown();
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-center w-10 h-10 text-gray-700 rounded-full hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dropdown-toggle"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 22C14.7614 22 17 17.5228 17 12C17 6.47715 14.7614 2 12 2C9.23858 2 7 6.47715 7 12C7 17.5228 9.23858 22 12 22Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 12H22"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="w-48 p-2 right-0 mt-2"
      >
        <div className="grid grid-cols-4 gap-2">
          {colors.map((color) => (
            <button
              key={color.name}
              onClick={() => handleColorChange(color.name)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                colorTheme === color.name
                  ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500"
                  : ""
              }`}
              style={{ backgroundColor: color.color }}
              title={color.label}
              aria-label={`Select ${color.label} theme`}
            >
              {colorTheme === color.name && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white"
                >
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      </Dropdown>
    </div>
  );
};
