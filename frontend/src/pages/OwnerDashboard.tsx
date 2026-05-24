import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, TrendingUp, Users, Eye, Phone, DollarSign, Plus, BarChart3, Settings, Bell, ChevronRight, Star, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatPrice } from '@/lib/utils';

const stats = [
  { label: 'Total Listings', value: 5, icon: Home, change: '+2', color: 'bg-blue-500' },
  { label: 'Total Views', value: 1245, icon: Eye, change: '+15%', color: 'bg-green-500' },
  { label: 'Leads Generated', value: 48, icon: Phone, change: '+8', color: 'bg-purple-500' },
  { label: 'Revenue', value: '₹3.2L', icon: DollarSign, change: '+12%', color: 'bg-gold-500' },
];

const listings = [
  { id: 'p1', title: '3BHK Luxury Apartment', society: 'DLF The Aralias', rent: 75000, views: 450, leads: 12, status: 'active', featured: true },
  { id: 'p2', title: '4BHK Penthouse', society: 'DLF The Aralias', rent: 120000, views: 320, leads: 8, status: 'active', featured: false },
  { id: 'p3', title: '2BHK Apartment', society: 'DLF Park Place', rent: 45000, views: 280, leads: 15, status: 'active', featured: false },
];

const recentLeads = [
  { id: 'l1', name: 'Rahul Sharma', phone: '+91 99999 88888', property: '3BHK Luxury Apartment', date: '2025-05-22', status: 'new' },
  { id: 'l2', name: 'Priya Gupta', phone: '+91 98765 43210', property: '4BHK Penthouse', date: '2025-05-21', status: 'contacted' },
  { id: 'l3', name: 'Amit Kumar', phone: '+91 87654 32109', property: '3BHK Luxury Apartment', date: '2025-05-20', status: 'visited' },
];

export function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-ivory-100">
      {/* Header */}
      <div className="bg-white border-b border-navy-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-navy-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-navy-900">Owner Dashboard</h1>
                <p className="text-sm text-navy-500">Welcome back, Rajesh</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="border-navy-200">
                <Bell className="w-4 h-4 mr-2" /> Notifications
              </Button>
              <Button variant="outline" size="sm" className="border-navy-200">
                <Settings className="w-4 h-4 mr-2" /> Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-white border border-navy-100 p-1 rounded-xl mb-8">
            <TabsTrigger value="overview" className="flex-1 rounded-lg data-[state=active]:bg-navy-500 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="listings" className="flex-1 rounded-lg data-[state=active]:bg-navy-500 data-[state=active]:text-white">
              <Home className="w-4 h-4 mr-2" /> Listings
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex-1 rounded-lg data-[state=active]:bg-navy-500 data-[state=active]:text-white">
              <Phone className="w-4 h-4 mr-2" /> Leads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-white rounded-xl border border-navy-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.color)}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <Badge className="bg-green-50 text-green-700 border-green-200">
                        <ArrowUpRight className="w-3 h-3 mr-1" /> {stat.change}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold text-navy-900">{stat.value}</p>
                    <p className="text-sm text-navy-500">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-navy-100 p-6">
              <h2 className="text-lg font-semibold text-navy-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button className="h-auto py-6 bg-navy-500 hover:bg-navy-600 flex flex-col items-center gap-2">
                  <Plus className="w-6 h-6" />
                  <span>Add New Listing</span>
                </Button>
                <Button variant="outline" className="h-auto py-6 border-navy-200 flex flex-col items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  <span>View Analytics</span>
                </Button>
                <Button variant="outline" className="h-auto py-6 border-navy-200 flex flex-col items-center gap-2">
                  <Star className="w-6 h-6" />
                  <span>Upgrade Plan</span>
                </Button>
                <Button variant="outline" className="h-auto py-6 border-navy-200 flex flex-col items-center gap-2">
                  <Settings className="w-6 h-6" />
                  <span>Settings</span>
                </Button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-navy-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-navy-900">Recent Leads</h2>
                  <Button variant="ghost" size="sm" className="text-navy-500">
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-3">
                  {recentLeads.slice(0, 3).map(lead => (
                    <div key={lead.id} className="flex items-center justify-between p-3 bg-ivory-100 rounded-xl">
                      <div>
                        <p className="font-medium text-navy-900">{lead.name}</p>
                        <p className="text-xs text-navy-500">{lead.property}</p>
                      </div>
                      <Badge className={cn(
                        lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                        lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      )}>
                        {lead.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-navy-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-navy-900">Top Performing Listings</h2>
                </div>
                <div className="space-y-3">
                  {listings.slice(0, 3).map((listing, i) => (
                    <div key={listing.id} className="flex items-center gap-4 p-3 bg-ivory-100 rounded-xl">
                      <div className="w-8 h-8 bg-navy-500 rounded-lg flex items-center justify-center text-white font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-navy-900">{listing.title}</p>
                        <p className="text-xs text-navy-500">{listing.society}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-navy-900">{listing.views} views</p>
                        <p className="text-xs text-navy-500">{listing.leads} leads</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="listings" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-navy-900">My Listings</h2>
              <Button className="bg-navy-500 hover:bg-navy-600">
                <Plus className="w-4 h-4 mr-2" /> Add Listing
              </Button>
            </div>
            <div className="grid gap-4">
              {listings.map(listing => (
                <div key={listing.id} className="bg-white rounded-2xl border border-navy-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-navy-900">{listing.title}</h3>
                        {listing.featured && (
                          <Badge className="bg-gold-100 text-gold-700 border-gold-200">Featured</Badge>
                        )}
                        <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                      </div>
                      <p className="text-sm text-navy-500">{listing.society}</p>
                    </div>
                    <p className="text-xl font-bold text-navy-900">{formatPrice(listing.rent)}</p>
                  </div>
                  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-navy-50">
                    <div className="flex items-center gap-2 text-sm text-navy-600">
                      <Eye className="w-4 h-4" /> {listing.views} views
                    </div>
                    <div className="flex items-center gap-2 text-sm text-navy-600">
                      <Phone className="w-4 h-4" /> {listing.leads} leads
                    </div>
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="sm" className="border-navy-200">Edit</Button>
                      <Button variant="outline" size="sm" className="border-navy-200">Promote</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="leads" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-navy-900">All Leads</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-navy-200">Filter</Button>
                <Button variant="outline" size="sm" className="border-navy-200">Export</Button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-navy-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-navy-50">
                    <th className="text-left p-4 text-sm font-semibold text-navy-700">Name</th>
                    <th className="text-left p-4 text-sm font-semibold text-navy-700">Property</th>
                    <th className="text-left p-4 text-sm font-semibold text-navy-700">Date</th>
                    <th className="text-center p-4 text-sm font-semibold text-navy-700">Status</th>
                    <th className="text-right p-4 text-sm font-semibold text-navy-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map(lead => (
                    <tr key={lead.id} className="border-t border-navy-50 hover:bg-navy-50/50">
                      <td className="p-4">
                        <p className="font-medium text-navy-900">{lead.name}</p>
                        <p className="text-xs text-navy-500">{lead.phone}</p>
                      </td>
                      <td className="p-4 text-sm text-navy-700">{lead.property}</td>
                      <td className="p-4 text-sm text-navy-500">{lead.date}</td>
                      <td className="p-4 text-center">
                        <Badge className={cn(
                          lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                          lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        )}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button size="sm" className="bg-navy-500 hover:bg-navy-600">
                          <Phone className="w-3 h-3 mr-1" /> Call
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
