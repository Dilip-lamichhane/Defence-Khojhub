import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserButton, useAuth, useUser } from '@clerk/clerk-react';
import { useTheme } from '../contexts/themeContext';
import { useAppSelector } from '../store/hooks';
import ThemeToggle from '../components/ThemeToggle.jsx';
import MapComponent from '../components/MapComponent.jsx';

import { 
  ChevronRight, 
  LayoutDashboard, 
  Users, 
  Package,
  Settings, 
  ShieldCheck, 
  Bug, 
  HelpCircle,
  ChevronsUpDown,
  LogOut,
  Bell,
  CreditCard,
  BadgeCheck,
  Menu,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Activity,
  Sun,
  Moon
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const apiRequest = async (path, options = {}, token) => {
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal
    });

    const resClone = res.clone();
    const payload = await res.json().catch(() => null);
    const rawText = payload ? '' : await resClone.text().catch(() => '');
    if (!res.ok) {
      const base = payload?.error || payload?.message || `Request failed: ${res.status}`;
      const details = payload?.details
        ? `: ${payload.details}`
        : rawText
          ? `: ${rawText.slice(0, 300)}`
          : '';
      throw new Error(`${base}${details}`);
    }
    return payload;
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

// UI Components replicated from shadcn-admin
const Card = ({ className = '', children, ...props }) => (
  <div
    className={`flex flex-col gap-6 rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 py-6 text-gray-900 dark:text-white shadow-sm ${className}`}
    {...props}
  >
    {children}
  </div>
);

const CardHeader = ({ className = '', children, ...props }) => (
  <div className={`grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 ${className}`} {...props}>
    {children}
  </div>
);

const CardTitle = ({ className = '', children, ...props }) => (
  <div className={`leading-none font-semibold text-lg text-gray-900 dark:text-white ${className}`} {...props}>
    {children}
  </div>
);

const CardDescription = ({ className = '', children, ...props }) => (
  <div className={`text-sm text-gray-500 ${className}`} {...props}>
    {children}
  </div>
);

const CardContent = ({ className = '', children, ...props }) => (
  <div className={`px-6 ${className}`} {...props}>
    {children}
  </div>
);

const Button = ({ 
  variant = 'default', 
  size = 'default', 
  className = '', 
  children, 
  asChild = false,
  ...props 
}) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";
  
  const variants = {
    default: 'bg-blue-600 text-white shadow-xs hover:bg-blue-600/90',
    destructive: 'bg-red-600 text-white shadow-xs hover:bg-red-600/90',
    outline: 'border bg-white dark:bg-gray-800 shadow-xs hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100',
    secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xs hover:bg-gray-100/80 dark:hover:bg-gray-800/80',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100',
    link: 'text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline',
  };
  
  const sizes = {
    default: 'h-9 px-4 py-2 has-[>svg]:px-3',
    sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
    lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
    icon: 'size-9',
  };
  
  const Comp = asChild ? 'div' : 'button';
  
  return (
    <Comp
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </Comp>
  );
};

// Sidebar Data
const sidebarData = {
  user: {
    name: 'Admin User',
    email: 'admin@khojhub.com',
    avatar: '/avatars/admin.jpg',
  },
  teams: [
    {
      name: 'KhojHub Admin',
      logo: null,
      plan: 'Enterprise',
    },
    {
      name: 'Development',
      logo: null,
      plan: 'Team',
    },
  ],
  navGroups: [
    {
      title: 'Admin',
      items: [
        {
          title: 'Dashboard',
          url: '/admin',
          icon: LayoutDashboard,
        },
        {
          title: 'Shop Management',
          url: '/admin/shops',
          icon: Package,
        },
        {
          title: 'Product Moderation',
          url: '/admin/products',
          icon: ShoppingCart,
        },
        {
          title: 'User Management',
          url: '/admin/users',
          icon: Users,
        },
        {
          title: 'Map & Locations',
          url: '/admin/map',
          icon: Activity,
        },
        {
          title: 'Reports',
          url: '/admin/reports',
          icon: Bug,
        },
      ],
    },
    {
      title: 'System',
      items: [
        {
          title: 'Permissions',
          url: '/admin/permissions',
          icon: ShieldCheck,
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          title: 'Settings',
          url: '/admin/settings',
          icon: Settings,
        },
        {
          title: 'Help Center',
          url: '/admin/help',
          icon: HelpCircle,
        },
      ],
    },
  ],
};

// Sidebar Components
const SidebarMenuButton = ({ children, isActive = false, onClick, tooltip, className = '', ...props }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive 
        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
    } ${className}`}
    title={tooltip}
    {...props}
  >
    {children}
  </button>
);

const SidebarMenuItem = ({ children, className = '', ...props }) => (
  <li className={`list-none ${className}`} {...props}>
    {children}
  </li>
);

const SidebarMenu = ({ children, className = '', ...props }) => (
  <ul className={`space-y-1 ${className}`} {...props}>
    {children}
  </ul>
);

const SidebarGroup = ({ children, className = '', ...props }) => (
  <div className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
);

const SidebarGroupLabel = ({ children, className = '', ...props }) => (
  <h3 className={`px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${className}`} {...props}>
    {children}
  </h3>
);

const SidebarMenuSub = ({ children, className = '', ...props }) => (
  <ul className={`ml-4 mt-1 space-y-1 ${className}`} {...props}>
    {children}
  </ul>
);

const SidebarMenuSubItem = ({ children, className = '', ...props }) => (
  <li className={`list-none ${className}`} {...props}>
    {children}
  </li>
);

const SidebarMenuSubButton = ({ children, isActive = false, onClick, className = '', ...props }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
      isActive 
        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Collapsible = ({ children, defaultOpen = false, className = '', ...props }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className={className} {...props}>
      {React.Children.map(children, child => 
        React.cloneElement(child, { isOpen, setIsOpen })
      )}
    </div>
  );
};

const CollapsibleTrigger = ({ children, isOpen, setIsOpen, className = '', ...props }) => {
  const { asChild: _asChild, ...domProps } = props;
  return (
    <div onClick={() => setIsOpen(!isOpen)} className={`cursor-pointer ${className}`} {...domProps}>
      {children}
    </div>
  );
};

const CollapsibleContent = ({ children, isOpen, className = '', ...props }) => {
  if (!isOpen) return null;
  const { asChild: _asChild, ...domProps } = props;
  return (
    <div className={className} {...domProps}>
      {children}
    </div>
  );
};

const NavUser = ({ user, isOpen: parentIsOpen, setIsOpen: parentSetIsOpen }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isSidebarCollapsed } = useTheme();
  
  // Use local state, ignore parent props if they exist
  const localIsOpen = parentIsOpen !== undefined ? parentIsOpen : isOpen;
  const localSetIsOpen = parentSetIsOpen !== undefined ? parentSetIsOpen : setIsOpen;
  
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="relative">
        <button
          onClick={() => localSetIsOpen(!localIsOpen)}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={isSidebarCollapsed ? user.name : undefined}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              {user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          {!isSidebarCollapsed && (
            <div className="flex-1 text-start transition-opacity duration-200">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          )}
          {!isSidebarCollapsed && <ChevronsUpDown className="h-4 w-4 text-gray-400" />}
        </button>
        
        {localIsOpen && !isSidebarCollapsed && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10">
            <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <BadgeCheck className="h-4 w-4" />
              Account
            </button>
            <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <CreditCard className="h-4 w-4" />
              Billing
            </button>
            <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Bell className="h-4 w-4" />
              Notifications
            </button>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TeamSwitcher = ({ teams, selectedTeam, setSelectedTeam }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isSidebarCollapsed } = useTheme();
  
  return (
    <div className="mb-4">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={isSidebarCollapsed ? selectedTeam.name : undefined}
        >
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">K</span>
          </div>
          {!isSidebarCollapsed && (
            <div className="flex-1 text-start transition-opacity duration-200">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedTeam.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{selectedTeam.plan}</p>
            </div>
          )}
          {!isSidebarCollapsed && <ChevronsUpDown className="h-4 w-4 text-gray-400" />}
        </button>
        
        {isOpen && !isSidebarCollapsed && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10">
            {teams.map((team, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedTeam(team);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs font-bold">K</span>
                </div>
                <div className="flex-1 text-start">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{team.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{team.plan}</p>
                </div>
                {selectedTeam.name === team.name && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const NavGroup = ({ title, items }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSidebarCollapsed } = useTheme();
  
  const checkIsActive = (href, item, mainNav = false) => {
    return (
      href === item.url ||
      href.split('?')[0] === item.url ||
      !!item?.items?.filter((i) => i.url === href).length ||
      (mainNav &&
        href.split('/')[1] !== '' &&
        href.split('/')[1] === item?.url?.split('/')[1])
    );
  };
  
  return (
    <SidebarGroup>
      {!isSidebarCollapsed && <SidebarGroupLabel>{title}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const key = `${item.title}-${item.url}`;
          
          if (!item.items) {
            return (
              <SidebarMenuItem key={key}>
                <SidebarMenuButton
                  isActive={checkIsActive(location.pathname, item)}
                  onClick={() => navigate(item.url)}
                  tooltip={isSidebarCollapsed ? item.title : undefined}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {!isSidebarCollapsed && <span className="transition-opacity duration-200">{item.title}</span>}
                  {item.badge && !isSidebarCollapsed && (
                    <Badge variant="default" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }
          
          return (
            <Collapsible
              key={key}
              defaultOpen={checkIsActive(location.pathname, item, true)}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={checkIsActive(location.pathname, item, true)}
                    tooltip={isSidebarCollapsed ? item.title : undefined}
                  >
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {!isSidebarCollapsed && <span className="transition-opacity duration-200">{item.title}</span>}
                    {item.badge && !isSidebarCollapsed && (
                      <Badge variant="default" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                    {!isSidebarCollapsed && <ChevronRight className="ml-auto h-4 w-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={`${subItem.title}-${subItem.url}`}>
                        <SidebarMenuSubButton
                          isActive={checkIsActive(location.pathname, subItem)}
                          onClick={() => navigate(subItem.url)}
                        >
                          {subItem.icon && <subItem.icon className="h-4 w-4" />}
                          {!isSidebarCollapsed && <span className="transition-opacity duration-200">{subItem.title}</span>}
                          {subItem.badge && !isSidebarCollapsed && (
                            <Badge variant="default" className="ml-auto">
                              {subItem.badge}
                            </Badge>
                          )}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};

// Error notification component
  const ErrorNotification = ({ message, onClose }) => (
    <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-start">
        <div className="shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="text-sm text-red-700 mt-1">{message}</p>
        </div>
        <div className="ml-4 shrink-0">
          <button
            onClick={onClose}
            className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition ease-in-out duration-150"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  const Sidebar = ({ children, isCollapsed = false, className = '', ...props }) => (
  <aside className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-40 ${
    isCollapsed ? 'w-16' : 'w-64'
  } ${className}`} {...props}>
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  </aside>
);

const Tabs = ({ defaultValue, children, className = '', ...props }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  return (
    <div className={className} {...props}>
      {React.Children.map(children, child => 
        React.cloneElement(child, { activeTab, setActiveTab })
      )}
    </div>
  );
};

const TabsList = ({ children, className = '', ...props }) => (
  <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 ${className}`} {...props}>
    {children}
  </div>
);

const TabsTrigger = ({ value, children, activeTab, setActiveTab, className = '', ...props }) => (
  <button
    onClick={() => setActiveTab(value)}
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
      activeTab === value 
        ? 'bg-white dark:bg-gray-800 text-gray-950 dark:text-white shadow-sm' 
        : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);

const TabsContent = ({ value, children, activeTab, className = '', ...props }) => {
  if (activeTab !== value) return null;
  return (
    <div className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 ${className}`} {...props}>
      {children}
    </div>
  );
};

const Avatar = ({ className = '', children, ...props }) => (
  <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`} {...props}>
    {children}
  </div>
);

const AvatarImage = ({ src, alt, className = '', ...props }) => (
  <img className={`aspect-square h-full w-full ${className}`} src={src} alt={alt} {...props} />
);

const AvatarFallback = ({ children, className = '', ...props }) => (
  <div className={`flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-sm ${className}`} {...props}>
    {children}
  </div>
);

const Badge = ({ variant = 'default', className = '', children, ...props }) => {
  const variants = {
    default: 'bg-blue-100 text-blue-800 hover:bg-blue-100/80',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-100/80',
    destructive: 'bg-red-100 text-red-800 hover:bg-red-100/80',
    outline: 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
  };
  
  return (
    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};

// Data definitions moved before component
const buildDayLabels = () => {
  const now = new Date();
  const labels = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
  }
  return labels;
};

const buildWeekLabels = () => {
  const now = new Date();
  const labels = [];
  for (let i = 7; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(d);
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    const label = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    labels.push(`Wk of ${label}`);
  }
  return labels;
};

const shopsPerDaySeed = buildDayLabels().map((name) => ({ name, shopsCreated: 0 }));
const pendingApprovalsSeed = buildDayLabels().map((name) => ({ name, pendingApprovals: 0 }));
const productsPerWeekSeed = buildWeekLabels().map((name) => ({ name, productsAdded: 0 }));

const stats = [
  {
    title: 'Total Users',
    value: '0',
    change: 'Synced from backend',
    trend: 'up',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    title: 'Total Shops',
    value: '0',
    change: 'All shops in system',
    trend: 'up',
    icon: Package,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    title: 'Pending Shops',
    value: '0',
    change: 'Needs review',
    trend: 'up',
    icon: Activity,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100'
  },
  {
    title: 'Approved Shops',
    value: '0',
    change: 'Visible publicly',
    trend: 'up',
    icon: BadgeCheck,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    title: 'Total Products',
    value: '0',
    change: 'All active products',
    trend: 'up',
    icon: ShoppingCart,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100'
  },
  {
    title: 'Flagged Items',
    value: '0',
    change: 'Requires action',
    trend: 'up',
    icon: Bug,
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  {
    title: 'Active Today',
    value: '0',
    change: 'Logins in last 24h',
    trend: 'up',
    icon: Activity,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  }
];

const AdminPortal = () => {
  const { isSidebarCollapsed, toggleSidebar } = useTheme();
  const { getToken } = useAuth();
  const { isLoaded, isSignedIn } = useUser();
  const { activeSupabaseProject, isDemoMode } = useAppSelector((state) => state.auth);

  const location = useLocation();
  const [offset, setOffset] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statsData, setStatsData] = useState(stats);
  const [shopsPerDaySeries, setShopsPerDaySeries] = useState(shopsPerDaySeed);
  const [productsPerWeekSeries, setProductsPerWeekSeries] = useState(productsPerWeekSeed);
  const [pendingApprovalsSeries, setPendingApprovalsSeries] = useState(pendingApprovalsSeed);
  const [error, setError] = useState(null);
  const [shopsTab, setShopsTab] = useState('pending');
  const [shopsPage, setShopsPage] = useState(1);
  const [shops, setShops] = useState([]);
  const [, setShopsMeta] = useState({ total: 0, totalPages: 1 });
  const [shopsLoading, setShopsLoading] = useState(false);
  const [shopsError, setShopsError] = useState(null);
  const [supabaseShops, setSupabaseShops] = useState([]);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [supabaseError, setSupabaseError] = useState(null);
  const [selectedShopDetails, setSelectedShopDetails] = useState(null);
  const [shopDetailsLoading, setShopDetailsLoading] = useState(false);
  const [shopFilters, setShopFilters] = useState({
    location: '',
    activity: '',
    lastLogin: '',
    productCountMin: '',
    productCountMax: ''
  });
  const [shopActionReason, setShopActionReason] = useState('');
  const [shopRequestedChanges, setShopRequestedChanges] = useState('');
  const [shopEditMode, setShopEditMode] = useState(false);
  const [shopEditForm, setShopEditForm] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    lat: '',
    lng: ''
  });

  const [productsTab, setProductsTab] = useState('all');
  const [productsPage, setProductsPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [, setProductsMeta] = useState({ total: 0, totalPages: 1 });
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(null);

  const [selectedTeam, setSelectedTeam] = useState(sidebarData.teams[0]);

  const [usersPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [, setUsersMeta] = useState({ total: 0, totalPages: 1 });
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [roleSelections, setRoleSelections] = useState({});

  const [reportsTab, setReportsTab] = useState('open');
  const [reportsPage, setReportsPage] = useState(1);
  const [reports, setReports] = useState([]);
  const [, setReportsMeta] = useState({ total: 0, totalPages: 1 });
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState(null);

  const [mapShops, setMapShops] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState(null);

  const section = location.pathname.replace(/^\/admin\/?/, '').split('/')[0] || 'overview';
  const sectionTitle = {
    overview: 'Overview Dashboard',
    shops: 'Shop Management',
    products: 'Product Moderation',
    users: 'User Management',
    map: 'Map & Location Control',
    reports: 'Reports & Abuse Handling',
    permissions: 'Admin Permissions',
    settings: 'Settings',
    help: 'Help Center',
  }[section] || 'Admin Dashboard';

  const apiRequestWithToken = useCallback(
    async (path, options = {}) => {
      if (!isLoaded || !isSignedIn) {
        throw new Error('Authentication required');
      }
      const token = await getToken({ skipCache: true });
      if (!token) {
        throw new Error('Authentication required');
      }
      const prefix = selectedTeam.plan === 'Enterprise' ? '/enterprise' : '/dev';
      const modifiedPath = path.replace(/^\/admin/, `/admin${prefix}`);
      return apiRequest(modifiedPath, options, token);
    },
    [getToken, isLoaded, isSignedIn, selectedTeam.plan]
  );

  const buildShopQuery = useCallback((nextPage = shopsPage, nextTab = shopsTab) => {
    const params = new URLSearchParams();
    params.set('status', nextTab);
    params.set('page', String(nextPage));
    params.set('limit', '20');

    if (nextTab === 'approved') {
      if (shopFilters.location.trim()) params.set('location', shopFilters.location.trim());
      if (shopFilters.activity) params.set('activity', shopFilters.activity);
      if (shopFilters.lastLogin) params.set('lastLogin', shopFilters.lastLogin);
      if (shopFilters.productCountMin) params.set('productCountMin', shopFilters.productCountMin);
      if (shopFilters.productCountMax) params.set('productCountMax', shopFilters.productCountMax);
    }

    return params.toString();
  }, [shopFilters, shopsPage, shopsTab]);

  const supabaseTabLabel = shopsTab.replaceAll('_', ' ');

  const refreshOverview = useCallback(async () => {
    const data = await apiRequestWithToken('/admin/overview');
    const cards = data?.cards || {};
    setStatsData((prev) =>
      prev.map((stat) => {
        const next = { ...stat };
        if (stat.title === 'Total Users') next.value = String(cards.totalUsers ?? 0);
        if (stat.title === 'Total Shops') next.value = String(cards.totalShops ?? 0);
        if (stat.title === 'Pending Shops') next.value = String(cards.pendingShops ?? 0);
        if (stat.title === 'Approved Shops') next.value = String(cards.approvedShops ?? 0);
        if (stat.title === 'Total Products') next.value = String(cards.totalProducts ?? 0);
        if (stat.title === 'Flagged Items') next.value = String(cards.flaggedItems ?? 0);
        if (stat.title === 'Active Today') next.value = String(cards.activeToday ?? 0);
        return next;
      })
    );

    const charts = data?.charts || {};
    if (Array.isArray(charts.shopsPerDay)) {
      setShopsPerDaySeries(charts.shopsPerDay);
    }
    if (Array.isArray(charts.productsPerWeek)) {
      setProductsPerWeekSeries(charts.productsPerWeek);
    }
    if (Array.isArray(charts.pendingApprovalsPerDay)) {
      setPendingApprovalsSeries(charts.pendingApprovalsPerDay);
    }
  }, [apiRequestWithToken]);

  useEffect(() => {
    if (section !== 'overview') return;
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    let intervalId;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await refreshOverview();
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load overview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    intervalId = setInterval(load, 30000);
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [section, refreshOverview, isLoaded, isSignedIn]);

  useEffect(() => {
    if (section !== 'shops') return;
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    const load = async () => {
      setShopsLoading(true);
      setShopsError(null);
      try {
        const data = await apiRequestWithToken(`/admin/shops?${buildShopQuery(shopsPage, shopsTab)}`);
        if (cancelled) return;
        setShops(Array.isArray(data?.shops) ? data.shops : []);
        setShopsMeta({ total: Number(data?.total || 0), totalPages: Number(data?.totalPages || 1) });
      } catch (err) {
        if (!cancelled) setShopsError(err?.message || 'Failed to load shops');
      } finally {
        if (!cancelled) setShopsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [section, shopsPage, shopsTab, buildShopQuery, apiRequestWithToken, isLoaded, isSignedIn]);

  const refreshSupabaseShops = useCallback(
    async (nextTab = shopsTab) => {
      const data = await apiRequestWithToken(
        `/admin/supabase/shops?status=${encodeURIComponent(nextTab)}&limit=20&offset=0`
      );
      setSupabaseShops(Array.isArray(data?.shops) ? data.shops : []);
    },
    [apiRequestWithToken, shopsTab]
  );

  useEffect(() => {
    if (section !== 'shops') return;
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    const load = async () => {
      setSupabaseLoading(true);
      setSupabaseError(null);
      try {
        await refreshSupabaseShops(shopsTab);
      } catch (err) {
        if (!cancelled) setSupabaseError(err?.message || 'Failed to load Supabase shops');
      } finally {
        if (!cancelled) setSupabaseLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [section, refreshSupabaseShops, shopsTab, isLoaded, isSignedIn]);

  useEffect(() => {
    if (section !== 'products') return;
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    const load = async () => {
      setProductsLoading(true);
      setProductsError(null);
      try {
        const data = await apiRequestWithToken(
          `/admin/products?status=${encodeURIComponent(productsTab)}&page=${productsPage}&limit=20`
        );
        if (cancelled) return;
        setProducts(Array.isArray(data?.products) ? data.products : []);
        setProductsMeta({ total: Number(data?.total || 0), totalPages: Number(data?.totalPages || 1) });
      } catch (err) {
        if (!cancelled) setProductsError(err?.message || 'Failed to load products');
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [productsPage, productsTab, section, apiRequestWithToken, isLoaded, isSignedIn]);

  useEffect(() => {
    if (section !== 'users') return;
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    const load = async () => {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const data = await apiRequestWithToken(`/admin/users?page=${usersPage}&limit=20`);
        if (cancelled) return;
        const nextUsers = Array.isArray(data?.users) ? data.users : [];
        setUsers(nextUsers);
        setUsersMeta({ total: Number(data?.total || 0), totalPages: Number(data?.totalPages || 1) });
        setRoleSelections((prev) => {
          const next = { ...prev };
          nextUsers.forEach((user) => {
            if (!next[user._id]) next[user._id] = user.role || 'user';
          });
          return next;
        });
      } catch (err) {
        if (!cancelled) setUsersError(err?.message || 'Failed to load users');
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [section, usersPage, apiRequestWithToken, isLoaded, isSignedIn]);

  useEffect(() => {
    if (section !== 'reports') return;
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    const load = async () => {
      setReportsLoading(true);
      setReportsError(null);
      try {
        const data = await apiRequestWithToken(`/admin/reports?status=${encodeURIComponent(reportsTab)}&page=${reportsPage}&limit=20`);
        if (cancelled) return;
        setReports(Array.isArray(data?.reports) ? data.reports : []);
        setReportsMeta({ total: Number(data?.total || 0), totalPages: Number(data?.totalPages || 1) });
      } catch (err) {
        if (!cancelled) setReportsError(err?.message || 'Failed to load reports');
      } finally {
        if (!cancelled) setReportsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [reportsPage, reportsTab, section, apiRequestWithToken, isLoaded, isSignedIn]);

  useEffect(() => {
    if (section !== 'map') return;
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    const load = async () => {
      setMapLoading(true);
      setMapError(null);
      try {
        const data = await apiRequestWithToken('/admin/shops?status=approved&page=1&limit=500');
        if (cancelled) return;
        setMapShops(Array.isArray(data?.shops) ? data.shops : []);
      } catch (err) {
        if (!cancelled) setMapError(err?.message || 'Failed to load shops');
      } finally {
        if (!cancelled) setMapLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [section, apiRequestWithToken, isLoaded, isSignedIn]);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
  };

  const formatRoleLabel = (role) => {
    if (role === 'customer') return 'user';
    if (role === 'shopkeeper') return 'shopowner';
    return role || 'user';
  };

  const getShopLatLng = (shop) => {
    const coords = shop?.location?.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2) return null;
    return { lat: coords[1], lng: coords[0] };
  };

  const getStaticMapUrl = (shop, size = '160x120') => {
    if (!MAPS_API_KEY) return '';
    const coords = getShopLatLng(shop);
    if (!coords) return '';
    const center = `${coords.lat},${coords.lng}`;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=15&size=${size}&maptype=roadmap&markers=color:red%7C${center}&key=${MAPS_API_KEY}`;
  };

  const refreshShops = async (nextPage = shopsPage, nextTab = shopsTab) => {
    const data = await apiRequestWithToken(`/admin/shops?${buildShopQuery(nextPage, nextTab)}`);
    setShops(Array.isArray(data?.shops) ? data.shops : []);
    setShopsMeta({ total: Number(data?.total || 0), totalPages: Number(data?.totalPages || 1) });
  };

  const openShopDetails = async (shopId) => {
    setShopDetailsLoading(true);
    setShopsError(null);
    try {
      const data = await apiRequestWithToken(`/admin/shops/${shopId}`);
      setSelectedShopDetails(data);
      const shop = data?.shop;
      const coords = getShopLatLng(shop);
      setShopEditForm({
        name: shop?.name || '',
        description: shop?.description || '',
        phone: shop?.contact?.phone || '',
        email: shop?.contact?.email || '',
        website: shop?.contact?.website || '',
        street: shop?.address?.street || '',
        city: shop?.address?.city || '',
        state: shop?.address?.state || '',
        zipCode: shop?.address?.zipCode || '',
        country: shop?.address?.country || '',
        lat: coords?.lat ? String(coords.lat) : '',
        lng: coords?.lng ? String(coords.lng) : ''
      });
      setShopActionReason('');
      setShopRequestedChanges('');
      setShopEditMode(false);
    } catch (err) {
      setShopsError(err?.message || 'Failed to load shop details');
    } finally {
      setShopDetailsLoading(false);
    }
  };

  const setShopStatus = async (shopId, action, payload = {}) => {
    let reason = payload.reason;
    let requestedChanges = payload.requestedChanges;

    if (action === 'reject' && reason === undefined) {
      reason = window.prompt('Rejection reason:') || '';
      if (!reason.trim()) return;
    }

    if (action === 'request_changes' && requestedChanges === undefined) {
      requestedChanges = window.prompt('Requested changes:') || '';
      if (!requestedChanges.trim()) return;
    }

    if (action === 'suspend' && reason === undefined) {
      reason = window.prompt('Suspension reason (optional):') || '';
    }

    if (action === 'revoke' && reason === undefined) {
      reason = window.prompt('Revoke reason (optional):') || '';
    }

    setShopsLoading(true);
    setShopsError(null);
    try {
      await apiRequestWithToken(`/admin/shops/${shopId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, requestedChanges }),
      });
      await refreshShops();
      await refreshOverview();
      if (selectedShopDetails?.shop?._id === shopId) {
        await openShopDetails(shopId);
      }
    } catch (err) {
      setShopsError(err?.message || 'Failed to update shop status');
    } finally {
      setShopsLoading(false);
    }
  };

  const setSupabaseShopStatus = async (shopId, action) => {
    setSupabaseLoading(true);
    setSupabaseError(null);
    try {
      await apiRequestWithToken(`/admin/supabase/shops/${shopId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await refreshSupabaseShops(shopsTab);
      await refreshOverview();
    } catch (err) {
      setSupabaseError(err?.message || 'Failed to update Supabase shop');
    } finally {
      setSupabaseLoading(false);
    }
  };

  const saveShopInfo = async () => {
    if (!selectedShopDetails?.shop?._id) return;
    setShopDetailsLoading(true);
    setShopsError(null);
    try {
      const body = {
        name: shopEditForm.name,
        description: shopEditForm.description,
        address: {
          street: shopEditForm.street,
          city: shopEditForm.city,
          state: shopEditForm.state,
          zipCode: shopEditForm.zipCode,
          country: shopEditForm.country
        },
        contact: {
          phone: shopEditForm.phone,
          email: shopEditForm.email,
          website: shopEditForm.website
        }
      };

      if (shopEditForm.lat && shopEditForm.lng) {
        body.location = {
          type: 'Point',
          coordinates: [Number(shopEditForm.lng), Number(shopEditForm.lat)]
        };
      }

      await apiRequestWithToken(`/admin/shops/${selectedShopDetails.shop._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await refreshShops();
      await openShopDetails(selectedShopDetails.shop._id);
    } catch (err) {
      setShopsError(err?.message || 'Failed to update shop');
    } finally {
      setShopDetailsLoading(false);
    }
  };

  const transferOwnership = async (shopId) => {
    const ownerInput = window.prompt('New owner email or user id:') || '';
    if (!ownerInput.trim()) return;
    setShopsLoading(true);
    setShopsError(null);
    try {
      const payload = ownerInput.includes('@')
        ? { ownerEmail: ownerInput }
        : { ownerId: ownerInput };
      await apiRequestWithToken(`/admin/shops/${shopId}/owner`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await refreshShops();
      if (selectedShopDetails?.shop?._id === shopId) {
        await openShopDetails(shopId);
      }
    } catch (err) {
      setShopsError(err?.message || 'Failed to transfer ownership');
    } finally {
      setShopsLoading(false);
    }
  };

  const refreshProducts = async (nextPage = productsPage, nextTab = productsTab) => {
    const data = await apiRequestWithToken(
      `/admin/products?status=${encodeURIComponent(nextTab)}&page=${Number(nextPage)}&limit=20`
    );
    setProducts(Array.isArray(data?.products) ? data.products : []);
    setProductsMeta({ total: Number(data?.total || 0), totalPages: Number(data?.totalPages || 1) });
  };

  const moderateProduct = async (productId, action) => {
    let reason;
    if (action === 'flag') {
      reason = window.prompt('Flag reason (optional):') || '';
    }
    setProductsLoading(true);
    setProductsError(null);
    try {
      await apiRequestWithToken(`/admin/products/${productId}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      await refreshProducts();
    } catch (err) {
      setProductsError(err?.message || 'Failed to moderate product');
    } finally {
      setProductsLoading(false);
    }
  };

  const refreshUsers = async (nextPage = usersPage) => {
    const data = await apiRequestWithToken(`/admin/users?page=${Number(nextPage)}&limit=20`);
    const nextUsers = Array.isArray(data?.users) ? data.users : [];
    setUsers(nextUsers);
    setUsersMeta({ total: Number(data?.total || 0), totalPages: Number(data?.totalPages || 1) });
    setRoleSelections((prev) => {
      const next = { ...prev };
      nextUsers.forEach((user) => {
        if (!next[user._id]) next[user._id] = user.role || 'user';
      });
      return next;
    });
  };

  const setUserStatus = async (userId, action) => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      await apiRequestWithToken(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await refreshUsers();
    } catch (err) {
      setUsersError(err?.message || 'Failed to update user');
    } finally {
      setUsersLoading(false);
    }
  };

  const setUserRole = async (userId, role) => {
    const confirmation = window.prompt(`Type "${role}" to confirm role change:`) || '';
    if (confirmation !== role) return;

    setUsersLoading(true);
    setUsersError(null);
    try {
      await apiRequestWithToken(`/admin/change-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerkId: userId, role, confirm: true }),
      });
      await refreshUsers();
    } catch (err) {
      setUsersError(err?.message || 'Failed to update role');
    } finally {
      setUsersLoading(false);
    }
  };

  const refreshReports = async (nextPage = reportsPage, nextTab = reportsTab) => {
    const data = await apiRequestWithToken(
      `/admin/reports?status=${encodeURIComponent(nextTab)}&page=${Number(nextPage)}&limit=20`
    );
    setReports(Array.isArray(data?.reports) ? data.reports : []);
    setReportsMeta({ total: Number(data?.total || 0), totalPages: Number(data?.totalPages || 1) });
  };

  const updateReportStatus = async (reportId, status) => {
    const adminNote = window.prompt('Admin note (optional):') || '';
    setReportsLoading(true);
    setReportsError(null);
    try {
      await apiRequestWithToken(`/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote }),
      });
      await refreshReports();
    } catch (err) {
      setReportsError(err?.message || 'Failed to update report');
    } finally {
      setReportsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {isDemoMode && (
        <div className="bg-amber-50 text-amber-800 border-b border-amber-200 px-4 py-3 text-sm">
          Admin features disabled in demo mode. Active Supabase project: {activeSupabaseProject}.
        </div>
      )}
      {/* Error Notification */}

      {error && (
        <ErrorNotification 
          message={error} 
          onClose={() => setError(null)}
        />
      )}
      
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <Sidebar isCollapsed={isSidebarCollapsed} className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto">
            <TeamSwitcher teams={sidebarData.teams} selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} />
            
            {sidebarData.navGroups.map((group) => (
              <NavGroup key={group.title} title={group.title} items={group.items} />
            ))}
          </div>
          
          <div className="border-t border-gray-200 p-4">
            <NavUser user={sidebarData.user} />
          </div>
        </div>
      </Sidebar>
      
      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Header */}
        <header
          className={`z-30 h-16 sticky top-0 w-full transition-shadow bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 ${
            offset > 10 ? 'shadow-sm' : ''
          }`}
        >
          <div className="relative flex h-full items-center gap-3 p-4 sm:gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            
            {/* Sidebar toggle */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:block p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
                {sectionTitle}
              </h1>
            </div>
            
            <div className="flex-1" />
            
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative hidden sm:block">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 lg:w-64"
                />
              </div>
              
              <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 relative transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">3</span>
              </button>
              
              {/* Theme Toggle */}
              <ThemeToggle />
              
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 rounded-full"
                  }
                }}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{sectionTitle}</h1>
          {section === 'overview' && (
            <div className="flex items-center space-x-2">
              <Button variant="outline">Export</Button>
              <Button>Download Report</Button>
            </div>
          )}
        </div>

        {section === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {loading ? (
                // Loading skeleton for stats cards
                [1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="h-4 bg-gray-200 rounded w-20 sm:w-24"></div>
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded-lg"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-6 sm:h-8 bg-gray-200 rounded w-24 sm:w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-32 sm:w-48"></div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                statsData.map((stat, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                        {stat.title}
                      </CardTitle>
                      <div className={`p-1.5 sm:p-2 rounded-lg ${stat.bgColor}`}>
                        <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                      <div className="flex items-center mt-1">
                        {stat.trend === 'up' ? (
                          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />
                        )}
                        <p className={`text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                          {stat.change}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-7">
              <Card className="col-span-1 lg:col-span-4">
                <CardHeader>
                  <CardTitle>Shops Created Per Day</CardTitle>
                  <CardDescription>New shop submissions over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80 min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={240}>
                      <AreaChart data={shopsPerDaySeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="shopsCreated" stroke="#3b82f6" fill="url(#colorShops)" strokeWidth={2} />
                        <defs>
                          <linearGradient id="colorShops" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-1 lg:col-span-3">
                <CardHeader>
                  <CardTitle>Pending Approvals Trend</CardTitle>
                  <CardDescription>How the pending queue is changing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80 min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={240}>
                      <LineChart data={pendingApprovalsSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="pendingApprovals" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Products Added Per Week</CardTitle>
                  <CardDescription>New products created by shopkeepers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minHeight={220} minWidth={240}>
                      <BarChart data={productsPerWeekSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="productsAdded" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Health</CardTitle>
                  <CardDescription>What an admin should see instantly</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Backlog risk</span>
                      <Badge variant="secondary">Monitor</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Moderation load</span>
                      <Badge variant="secondary">Normal</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Map quality signals</span>
                      <Badge variant="secondary">Review</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {section === 'shops' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {['pending', 'approved', 'changes_requested', 'rejected', 'suspended', 'all'].map((tab) => (
                <Button
                  key={tab}
                  variant={shopsTab === tab ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setShopsTab(tab);
                    setShopsPage(1);
                    setSelectedShopDetails(null);
                  }}
                >
                  {tab.replaceAll('_', ' ')}
                </Button>
              ))}
            </div>

            {shopsTab === 'approved' && (
              <Card>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                  <CardDescription>Refine approved shops by location, activity, last login, and product count.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Location</label>
                      <input
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        value={shopFilters.location}
                        onChange={(e) => {
                          setShopsPage(1);
                          setShopFilters((prev) => ({ ...prev, location: e.target.value }));
                        }}
                        placeholder="City or area"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Activity</label>
                      <select
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        value={shopFilters.activity}
                        onChange={(e) => {
                          setShopsPage(1);
                          setShopFilters((prev) => ({ ...prev, activity: e.target.value }));
                        }}
                      >
                        <option value="">All</option>
                        <option value="7d">Active in 7 days</option>
                        <option value="30d">Active in 30 days</option>
                        <option value="90d">Active in 90 days</option>
                        <option value="inactive90">Inactive 90+ days</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Last Login</label>
                      <select
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        value={shopFilters.lastLogin}
                        onChange={(e) => {
                          setShopsPage(1);
                          setShopFilters((prev) => ({ ...prev, lastLogin: e.target.value }));
                        }}
                      >
                        <option value="">All</option>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="never">Never</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Min Products</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        value={shopFilters.productCountMin}
                        onChange={(e) => {
                          setShopsPage(1);
                          setShopFilters((prev) => ({ ...prev, productCountMin: e.target.value }));
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Max Products</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        value={shopFilters.productCountMax}
                        onChange={(e) => {
                          setShopsPage(1);
                          setShopFilters((prev) => ({ ...prev, productCountMax: e.target.value }));
                        }}
                        placeholder="Any"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShopsPage(1);
                        setShopFilters({
                          location: '',
                          activity: '',
                          lastLogin: '',
                          productCountMin: '',
                          productCountMax: ''
                        });
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {supabaseError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {supabaseError}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Supabase Shops</CardTitle>
                <CardDescription>{`Showing ${supabaseTabLabel} Supabase submissions.`}</CardDescription>
              </CardHeader>
              <CardContent>
                {supabaseLoading ? (
                  <div className="text-sm text-gray-500">Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Shop</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Email</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Phone</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">PAN</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Coordinates</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supabaseShops.map((shop) => (
                          <tr key={shop.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{shop.name}</td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{shop.email || '—'}</td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{shop.phone || '—'}</td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{shop.pan_number || '—'}</td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                              {shop.latitude}, {shop.longitude}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary">{shop.status || 'pending'}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-2">
                                {(shop.status || 'pending') === 'pending' && (
                                  <>
                                    <Button size="sm" onClick={() => setSupabaseShopStatus(shop.id, 'approve')}>
                                      Approve
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => setSupabaseShopStatus(shop.id, 'reject')}>
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {(shop.status || 'pending') === 'approved' && (
                                  <Button variant="outline" size="sm" onClick={() => setSupabaseShopStatus(shop.id, 'suspend')}>
                                    Suspend
                                  </Button>
                                )}
                                {(shop.status || 'pending') === 'suspended' && (
                                  <Button size="sm" onClick={() => setSupabaseShopStatus(shop.id, 'unsuspend')}>
                                    Unsuspend
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {supabaseShops.length === 0 && (
                          <tr>
                            <td className="py-6 px-4 text-sm text-gray-500" colSpan={7}>
                              No Supabase shops found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {shopsError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {shopsError}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Shops</CardTitle>
                <CardDescription>Approve, reject, request changes, or suspend shops.</CardDescription>
              </CardHeader>
              <CardContent>
                {shopsLoading ? (
                  <div className="text-sm text-gray-500">Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Shop</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Owner</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Location</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Phone</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Created</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">AI Risk</th>
                          {shopsTab !== 'pending' && (
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                          )}
                          {shopsTab === 'rejected' && (
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Reason</th>
                          )}
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shops.map((shop) => (
                          <tr
                            key={shop._id}
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                            onClick={() => openShopDetails(shop._id)}
                          >
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900 dark:text-white">{shop.name}</div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                              {shop.owner?.username || shop.owner?.email || '—'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                              <div className="flex items-center gap-3">
                                <div className="h-16 w-24 overflow-hidden rounded border border-gray-200 bg-gray-100">
                                  {getStaticMapUrl(shop) ? (
                                    <img
                                      src={getStaticMapUrl(shop)}
                                      alt="Shop location"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                                      No map
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                  {shop.address?.city || shop.address?.state || '—'}
                                  {Array.isArray(shop.location?.coordinates) && (
                                    <div className="text-[10px] text-gray-400">
                                      {shop.location.coordinates[1]}, {shop.location.coordinates[0]}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                              {shop.contact?.phone || '—'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                              {formatDateTime(shop.createdAt)}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                              {shop.aiRiskScore ?? '—'}
                            </td>
                            {shopsTab !== 'pending' && (
                              <td className="py-3 px-4">
                                <Badge variant="secondary">{shop.status || 'pending'}</Badge>
                              </td>
                            )}
                            {shopsTab === 'rejected' && (
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                                {shop.statusReason || '—'}
                              </td>
                            )}
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openShopDetails(shop._id);
                                  }}
                                >
                                  View
                                </Button>
                                {['pending', 'changes_requested'].includes(shop.status || 'pending') && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setShopStatus(shop._id, 'approve');
                                      }}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setShopStatus(shop._id, 'request_changes');
                                      }}
                                    >
                                      Request Changes
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setShopStatus(shop._id, 'reject');
                                      }}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {(shop.status || 'pending') === 'approved' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openShopDetails(shop._id);
                                        setShopEditMode(true);
                                      }}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        transferOwnership(shop._id);
                                      }}
                                    >
                                      Transfer
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setShopStatus(shop._id, 'revoke');
                                      }}
                                    >
                                      Revoke
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setShopStatus(shop._id, 'suspend');
                                      }}
                                    >
                                      Suspend
                                    </Button>
                                  </>
                                )}
                                {(shop.status || 'pending') === 'rejected' && (
                                  <Button
                                    size="sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setShopStatus(shop._id, 're_review');
                                    }}
                                  >
                                    Re-review
                                  </Button>
                                )}
                                {(shop.status || 'pending') === 'suspended' && (
                                  <Button
                                    size="sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setShopStatus(shop._id, 'unsuspend');
                                    }}
                                  >
                                    Unsuspend
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {shops.length === 0 && (
                          <tr>
                            <td
                              className="py-6 px-4 text-sm text-gray-500"
                              colSpan={7 + (shopsTab !== 'pending' ? 1 : 0) + (shopsTab === 'rejected' ? 1 : 0)}
                            >
                              No shops found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedShopDetails && (
              <Card>
                <CardHeader>
                  <CardTitle>Shop Details</CardTitle>
                  <CardDescription>{selectedShopDetails?.shop?.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  {shopDetailsLoading ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-wrap gap-2">
                        {['pending', 'changes_requested'].includes(selectedShopDetails?.shop?.status || 'pending') && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => setShopStatus(selectedShopDetails.shop._id, 'approve')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!shopRequestedChanges.trim()) {
                                  setShopsError('Requested changes is required.');
                                  return;
                                }
                                setShopStatus(selectedShopDetails.shop._id, 'request_changes', {
                                  requestedChanges: shopRequestedChanges
                                });
                              }}
                            >
                              Request Changes
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (!shopActionReason.trim()) {
                                  setShopsError('Rejection reason is required.');
                                  return;
                                }
                                setShopStatus(selectedShopDetails.shop._id, 'reject', { reason: shopActionReason });
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {(selectedShopDetails?.shop?.status || 'pending') === 'approved' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => setShopEditMode(true)}>
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => transferOwnership(selectedShopDetails.shop._id)}>
                              Transfer
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShopStatus(selectedShopDetails.shop._id, 'revoke')}>
                              Revoke
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setShopStatus(selectedShopDetails.shop._id, 'suspend')}>
                              Suspend
                            </Button>
                          </>
                        )}
                        {(selectedShopDetails?.shop?.status || 'pending') === 'rejected' && (
                          <Button size="sm" onClick={() => setShopStatus(selectedShopDetails.shop._id, 're_review')}>
                            Re-review
                          </Button>
                        )}
                        {(selectedShopDetails?.shop?.status || 'pending') === 'suspended' && (
                          <Button size="sm" onClick={() => setShopStatus(selectedShopDetails.shop._id, 'unsuspend')}>
                            Unsuspend
                          </Button>
                        )}
                      </div>

                      {['pending', 'changes_requested'].includes(selectedShopDetails?.shop?.status || 'pending') && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Rejection reason</label>
                            <input
                              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                              value={shopActionReason}
                              onChange={(event) => setShopActionReason(event.target.value)}
                              placeholder="Reason for rejection"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Requested changes</label>
                            <input
                              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                              value={shopRequestedChanges}
                              onChange={(event) => setShopRequestedChanges(event.target.value)}
                              placeholder="Changes needed"
                            />
                          </div>
                        </div>
                      )}

                      {shopEditMode && (
                        <div className="rounded-lg border border-gray-200 p-4 space-y-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Shop name</label>
                              <input
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                value={shopEditForm.name}
                                onChange={(event) => setShopEditForm((prev) => ({ ...prev, name: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Phone</label>
                              <input
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                value={shopEditForm.phone}
                                onChange={(event) => setShopEditForm((prev) => ({ ...prev, phone: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Email</label>
                              <input
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                value={shopEditForm.email}
                                onChange={(event) => setShopEditForm((prev) => ({ ...prev, email: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Website</label>
                              <input
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                value={shopEditForm.website}
                                onChange={(event) => setShopEditForm((prev) => ({ ...prev, website: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs font-medium text-gray-600">Description</label>
                              <textarea
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                rows="3"
                                value={shopEditForm.description}
                                onChange={(event) => setShopEditForm((prev) => ({ ...prev, description: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Street</label>
                              <input
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                value={shopEditForm.street}
                                onChange={(event) => setShopEditForm((prev) => ({ ...prev, street: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">City</label>
                              <input
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                value={shopEditForm.city}
                                onChange={(event) => setShopEditForm((prev) => ({ ...prev, city: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">State</label>
                              <input
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                value={shopEditForm.state}
                                onChange={(event) => setShopEditForm((prev) => ({ ...prev, state: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Zip code</label>
                              <input
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                value={shopEditForm.zipCode}
                                onChange={(event) => setShopEditForm((prev) => ({ ...prev, zipCode: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Country</label>
                              <input
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                value={shopEditForm.country}
                                onChange={(event) => setShopEditForm((prev) => ({ ...prev, country: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Latitude</label>
                              <input
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                value={shopEditForm.lat}
                                onChange={(event) => setShopEditForm((prev) => ({ ...prev, lat: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600">Longitude</label>
                              <input
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                value={shopEditForm.lng}
                                onChange={(event) => setShopEditForm((prev) => ({ ...prev, lng: event.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={saveShopInfo}>
                              Save
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShopEditMode(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {!shopEditMode && (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                          <div className="space-y-4 text-sm text-gray-700 dark:text-gray-200">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">Owner Info</div>
                              <div><span className="font-medium">Name:</span> {selectedShopDetails?.shop?.owner?.username || '—'}</div>
                              <div><span className="font-medium">Email:</span> {selectedShopDetails?.shop?.owner?.email || '—'}</div>
                              <div><span className="font-medium">Phone:</span> {selectedShopDetails?.shop?.owner?.phone || '—'}</div>
                              <div><span className="font-medium">Last login:</span> {formatDateTime(selectedShopDetails?.shop?.owner?.lastLogin)}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">Shop Overview</div>
                              <div><span className="font-medium">Status:</span> {selectedShopDetails?.shop?.status || 'pending'}</div>
                              {selectedShopDetails?.shop?.statusReason && (
                                <div><span className="font-medium">Reason:</span> {selectedShopDetails.shop.statusReason}</div>
                              )}
                              {selectedShopDetails?.shop?.requestedChanges && (
                                <div><span className="font-medium">Requested Changes:</span> {selectedShopDetails.shop.requestedChanges}</div>
                              )}
                              <div><span className="font-medium">Created:</span> {formatDateTime(selectedShopDetails?.shop?.createdAt)}</div>
                              <div><span className="font-medium">AI Risk:</span> {selectedShopDetails?.shop?.aiRiskScore ?? '—'}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">Submitted Data</div>
                              <div>
                                <span className="font-medium">Address:</span>{' '}
                                {[selectedShopDetails?.shop?.address?.street, selectedShopDetails?.shop?.address?.city, selectedShopDetails?.shop?.address?.state, selectedShopDetails?.shop?.address?.zipCode, selectedShopDetails?.shop?.address?.country]
                                  .filter(Boolean)
                                  .join(', ') || '—'}
                              </div>
                              <div>
                                <span className="font-medium">Contact:</span>{' '}
                                {[selectedShopDetails?.shop?.contact?.phone, selectedShopDetails?.shop?.contact?.email, selectedShopDetails?.shop?.contact?.website]
                                  .filter(Boolean)
                                  .join(' • ') || '—'}
                              </div>
                              <div>
                                <span className="font-medium">Business Hours:</span>{' '}
                                {selectedShopDetails?.shop?.businessHours
                                  ? Object.entries(selectedShopDetails.shop.businessHours)
                                      .map(([day, hours]) => `${day}: ${hours?.open || '—'} - ${hours?.close || '—'}`)
                                      .join(' | ')
                                  : '—'}
                              </div>
                              <div>
                                <span className="font-medium">Coordinates:</span>{' '}
                                {Array.isArray(selectedShopDetails?.shop?.location?.coordinates)
                                  ? `${selectedShopDetails.shop.location.coordinates[1]}, ${selectedShopDetails.shop.location.coordinates[0]}`
                                  : '—'}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Map Location</div>
                              <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                                {getStaticMapUrl(selectedShopDetails?.shop, '600x300') ? (
                                  <img
                                    src={getStaticMapUrl(selectedShopDetails?.shop, '600x300')}
                                    alt="Shop location"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-48 items-center justify-center text-sm text-gray-400">No map</div>
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Similar Nearby Shops</div>
                              <div className="space-y-2">
                                {(selectedShopDetails?.similarNearby || []).slice(0, 6).map((s) => (
                                  <div key={s._id} className="text-sm text-gray-600 dark:text-gray-300">
                                    {s.name}
                                  </div>
                                ))}
                                {(selectedShopDetails?.similarNearby || []).length === 0 && (
                                  <div className="text-sm text-gray-500">No nearby shops found.</div>
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Pre-added Products</div>
                              <div className="space-y-2">
                                {(selectedShopDetails?.products || []).slice(0, 6).map((p) => (
                                  <div key={p._id} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                                    <span className="truncate">{p.name}</span>
                                    <Badge variant="outline">{p.moderationStatus || 'active'}</Badge>
                                  </div>
                                ))}
                                {(selectedShopDetails?.products || []).length === 0 && (
                                  <div className="text-sm text-gray-500">No products.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {section === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {['all', 'active', 'flagged', 'hidden'].map((tab) => (
                <Button
                  key={tab}
                  variant={productsTab === tab ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setProductsTab(tab);
                    setProductsPage(1);
                  }}
                >
                  {tab}
                </Button>
              ))}
            </div>

            {productsError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {productsError}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
                <CardDescription>Moderate products uploaded by approved shops.</CardDescription>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="text-sm text-gray-500">Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Product</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Shop</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Price</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Created</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => (
                          <tr key={p._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                              <div className="text-xs text-gray-500">{p.category?.name || ''}</div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                              {p.shop?.name || '—'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                              {typeof p.price === 'number' ? `₹${p.price}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                              {formatDateTime(p.createdAt)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary">{p.moderationStatus || 'active'}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-2">
                                {p.moderationStatus !== 'hidden' ? (
                                  <Button variant="outline" size="sm" onClick={() => moderateProduct(p._id, 'hide')}>
                                    Hide
                                  </Button>
                                ) : (
                                  <Button variant="outline" size="sm" onClick={() => moderateProduct(p._id, 'unflag')}>
                                    Unhide
                                  </Button>
                                )}
                                {p.moderationStatus !== 'flagged' ? (
                                  <Button variant="outline" size="sm" onClick={() => moderateProduct(p._id, 'flag')}>
                                    Flag
                                  </Button>
                                ) : (
                                  <Button variant="outline" size="sm" onClick={() => moderateProduct(p._id, 'unflag')}>
                                    Unflag
                                  </Button>
                                )}
                                <Button variant="destructive" size="sm" onClick={() => moderateProduct(p._id, 'delete')}>
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {products.length === 0 && (
                          <tr>
                            <td className="py-6 px-4 text-sm text-gray-500" colSpan={6}>
                              No products found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {section === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-end">
              <Button variant="outline" size="sm" onClick={() => refreshUsers()}>
                Refresh Users
              </Button>
            </div>
            {usersError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {usersError}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>Manage user status and change roles using controlled workflows.</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-sm text-gray-500">Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Name / Username</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Role</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Owned Shop</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || '—'}
                              </div>
                              <div className="text-xs text-gray-500">{u.username ? `@${u.username}` : '—'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary">{formatRoleLabel(u.role)}</Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                              {u.ownedShop?.name || '—'}
                              {u.ownedShopCount > 1 && (
                                <span className="ml-1 text-xs text-gray-400">+{u.ownedShopCount - 1}</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={u.isActive ? 'default' : 'destructive'}>{u.isActive ? 'active' : 'banned'}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap items-center gap-2">
                                {u.isActive ? (
                                  <Button variant="destructive" size="sm" onClick={() => setUserStatus(u._id, 'ban')}>
                                    Ban
                                  </Button>
                                ) : (
                                  <Button size="sm" onClick={() => setUserStatus(u._id, 'unban')}>
                                    Unban
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => setUserStatus(u._id, 'reset')}>
                                  Reset Status
                                </Button>
                                <select
                                  className="rounded-md border border-gray-200 px-2 py-1 text-xs"
                                  value={roleSelections[u._id] || u.role || 'user'}
                                  onChange={(event) =>
                                    setRoleSelections((prev) => ({
                                      ...prev,
                                      [u._id]: event.target.value
                                    }))
                                  }
                                >
                                  <option value="user">User</option>
                                  <option value="shopowner">Shop Owner</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={(roleSelections[u._id] || u.role || 'user') === (u.role || 'user')}
                                  onClick={() => setUserRole(u._id, roleSelections[u._id] || u.role || 'user')}
                                >
                                  Change Role
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td className="py-6 px-4 text-sm text-gray-500" colSpan={5}>
                              No users found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {section === 'reports' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {['open', 'dismissed', 'action_taken', 'all'].map((tab) => (
                <Button
                  key={tab}
                  variant={reportsTab === tab ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setReportsTab(tab);
                    setReportsPage(1);
                  }}
                >
                  {tab.replaceAll('_', ' ')}
                </Button>
              ))}
            </div>

            {reportsError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {reportsError}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>Dismiss, take action, and log admin notes.</CardDescription>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
                  <div className="text-sm text-gray-500">Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Reporter</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Entity</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Reason</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Created</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((r) => (
                          <tr key={r._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                              {r.reporter?.email || r.reporter?.username || '—'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                              {r.entityType}:{' '}
                              <span className="font-mono">{String(r.entityId || '').slice(-6)}</span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary">{r.reason}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{r.status}</Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{formatDateTime(r.createdAt)}</td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => updateReportStatus(r._id, 'dismissed')}>
                                  Dismiss
                                </Button>
                                <Button size="sm" onClick={() => updateReportStatus(r._id, 'action_taken')}>
                                  Take action
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {reports.length === 0 && (
                          <tr>
                            <td className="py-6 px-4 text-sm text-gray-500" colSpan={6}>
                              No reports found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {section === 'map' && (
          <div className="space-y-6">
            {mapError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {mapError}
              </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Shop Map</CardTitle>
                <CardDescription>All approved shops rendered on the map.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] w-full overflow-hidden rounded-lg">
                  {mapLoading ? (
                    <div className="h-full flex items-center justify-center text-sm text-gray-500">Loading...</div>
                  ) : (
                    <MapComponent shops={mapShops} className="h-full w-full" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {section === 'permissions' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Permissions</CardTitle>
                <CardDescription>Controlled access for core admin operations.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">Allowed</div>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
                      <li>Approve shops</li>
                      <li>Reject shops</li>
                      <li>Suspend shops</li>
                      <li>Moderate products</li>
                      <li>Ban users</li>
                      <li>View analytics</li>
                      <li>Access reports</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">Restricted</div>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
                      <li>No bypassing RLS policies</li>
                      <li>No raw SQL actions from UI without superadmin</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {['settings', 'help'].includes(section) && (
          <Card>
            <CardHeader>
              <CardTitle>{sectionTitle}</CardTitle>
              <CardDescription>
                {section === 'settings' && 'Configuration and settings for the admin dashboard.'}
                {section === 'help' && 'Help and support resources for administrators.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-6 py-8 text-sm text-gray-500">
                Coming soon.
              </div>
            </CardContent>
          </Card>
        )}
        </main>
      </div>
    </div>
  );
};

export default AdminPortal;
