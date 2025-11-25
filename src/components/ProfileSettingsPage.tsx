import React, { useState, useCallback } from 'react';
import { User, Mail, Phone, Lock, Bell, Camera, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { toast } from 'sonner';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  staffId: string;
  department: string;
  address: string;
}

interface SecurityData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  resultApproval: boolean;
  paymentAlerts: boolean;
  systemUpdates: boolean;
  announcements: boolean;
}

export function ProfileSettingsPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: 'Fatima',
    lastName: 'Abubakar',
    email: 'fatima.abubakar@graceland.edu.ng',
    phone: '08012345678',
    role: 'Admin',
    staffId: 'STAFF001',
    department: 'Administration',
    address: '12 Ahmadu Bello Way, Gombe State'
  });

  const [securityData, setSecurityData] = useState<SecurityData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Optimized handlers to prevent re-renders on mobile
  const handleFirstNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({ ...prev, firstName: e.target.value }));
  }, []);

  const handleLastNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({ ...prev, lastName: e.target.value }));
  }, []);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({ ...prev, email: e.target.value }));
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({ ...prev, phone: e.target.value }));
  }, []);

  const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({ ...prev, address: e.target.value }));
  }, []);

  const handleCurrentPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSecurityData(prev => ({ ...prev, currentPassword: e.target.value }));
  }, []);

  const handleNewPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSecurityData(prev => ({ ...prev, newPassword: e.target.value }));
  }, []);

  const handleConfirmPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSecurityData(prev => ({ ...prev, confirmPassword: e.target.value }));
  }, []);

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: true,
    resultApproval: true,
    paymentAlerts: true,
    systemUpdates: false,
    announcements: true
  });

  const handleProfileUpdate = () => {
    toast.success('Profile updated successfully');
    setIsEditing(false);
  };

  const handlePasswordChange = () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (securityData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    toast.success('Password changed successfully');
    setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleNotificationToggle = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('Notification settings updated');
  };

  const getInitials = () => {
    return `${profileData.firstName[0]}${profileData.lastName[0]}`.toUpperCase();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[#0A2540] mb-2">Profile Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {/* Profile Card */}
      <Card className="border-[#0A2540]/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 bg-[#0A2540] text-white text-2xl">
                <AvatarFallback className="bg-[#0A2540] text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <Button 
                size="sm" 
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#0A2540] p-0"
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1">
              <h2 className="text-[#0A2540]">{profileData.firstName} {profileData.lastName}</h2>
              <p className="text-gray-600">{profileData.role} • {profileData.staffId}</p>
              <p className="text-sm text-gray-500 mt-1">{profileData.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-[#0A2540]/5 p-1 rounded-xl">
          <TabsTrigger value="profile" className="rounded-xl data-[state=active]:bg-[#0A2540] data-[state=active]:text-white">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl data-[state=active]:bg-[#0A2540] data-[state=active]:text-white">
            <Lock className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl data-[state=active]:bg-[#0A2540] data-[state=active]:text-white">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="border-[#0A2540]/10">
            <CardHeader className="border-b border-[#0A2540]/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#0A2540]">Personal Information</CardTitle>
                  <CardDescription>Update your personal details and contact information</CardDescription>
                </div>
                {!isEditing ? (
                  <Button 
                    onClick={() => setIsEditing(true)}
                    className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white rounded-xl"
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      className="rounded-xl border-[#0A2540]/20"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleProfileUpdate}
                      className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#0A2540] rounded-xl"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-[#0A2540]">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={handleFirstNameChange}
                    disabled={!isEditing}
                    className="border-[#0A2540]/20 rounded-xl disabled:opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-[#0A2540]">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={handleLastNameChange}
                    disabled={!isEditing}
                    className="border-[#0A2540]/20 rounded-xl disabled:opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#0A2540]">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={handleEmailChange}
                      disabled={!isEditing}
                      className="pl-10 border-[#0A2540]/20 rounded-xl disabled:opacity-60"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[#0A2540]">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={handlePhoneChange}
                      disabled={!isEditing}
                      className="pl-10 border-[#0A2540]/20 rounded-xl disabled:opacity-60"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staffId" className="text-[#0A2540]">Staff ID</Label>
                  <Input
                    id="staffId"
                    value={profileData.staffId}
                    disabled
                    className="border-[#0A2540]/20 rounded-xl opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-[#0A2540]">Department</Label>
                  <Input
                    id="department"
                    value={profileData.department}
                    disabled
                    className="border-[#0A2540]/20 rounded-xl opacity-60"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address" className="text-[#0A2540]">Address</Label>
                  <Input
                    id="address"
                    value={profileData.address}
                    onChange={handleAddressChange}
                    disabled={!isEditing}
                    className="border-[#0A2540]/20 rounded-xl disabled:opacity-60"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="border-[#0A2540]/10">
            <CardHeader className="border-b border-[#0A2540]/10">
              <CardTitle className="text-[#0A2540]">Security Settings</CardTitle>
              <CardDescription>Manage your password and account security</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Change Password */}
                <div className="space-y-4">
                  <h3 className="text-[#0A2540]">Change Password</h3>
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-[#0A2540]">Current Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="currentPassword"
                          type="password"
                          value={securityData.currentPassword}
                          onChange={handleCurrentPasswordChange}
                          className="pl-10 border-[#0A2540]/20 rounded-xl"
                          placeholder="Enter current password"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-[#0A2540]">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="newPassword"
                          type="password"
                          value={securityData.newPassword}
                          onChange={handleNewPasswordChange}
                          className="pl-10 border-[#0A2540]/20 rounded-xl"
                          placeholder="Enter new password"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-[#0A2540]">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={securityData.confirmPassword}
                          onChange={handleConfirmPasswordChange}
                          className="pl-10 border-[#0A2540]/20 rounded-xl"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handlePasswordChange}
                      className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white rounded-xl"
                    >
                      Update Password
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Two-Factor Authentication */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[#0A2540]">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <Separator />

                {/* Session Management */}
                <div className="space-y-4">
                  <h3 className="text-[#0A2540]">Active Sessions</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-[#0A2540]">Windows • Chrome</p>
                        <p className="text-sm text-gray-600">Gombe, Nigeria • Active now</p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl border-[#0A2540]/20">
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="border-[#0A2540]/10">
            <CardHeader className="border-b border-[#0A2540]/10">
              <CardTitle className="text-[#0A2540]">Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Email & SMS */}
                <div className="space-y-4">
                  <h3 className="text-[#0A2540]">Communication Channels</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-[#0A2540]" />
                        <div>
                          <p className="text-[#0A2540]">Email Notifications</p>
                          <p className="text-sm text-gray-600">Receive notifications via email</p>
                        </div>
                      </div>
                      <Switch 
                        checked={notifications.emailNotifications}
                        onCheckedChange={() => handleNotificationToggle('emailNotifications')}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-[#0A2540]" />
                        <div>
                          <p className="text-[#0A2540]">SMS Notifications</p>
                          <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                        </div>
                      </div>
                      <Switch 
                        checked={notifications.smsNotifications}
                        onCheckedChange={() => handleNotificationToggle('smsNotifications')}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Activity Notifications */}
                <div className="space-y-4">
                  <h3 className="text-[#0A2540]">Activity Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-[#0A2540]">Result Approval</p>
                        <p className="text-sm text-gray-600">Get notified when results are pending approval</p>
                      </div>
                      <Switch 
                        checked={notifications.resultApproval}
                        onCheckedChange={() => handleNotificationToggle('resultApproval')}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-[#0A2540]">Payment Alerts</p>
                        <p className="text-sm text-gray-600">Get notified about payment activities</p>
                      </div>
                      <Switch 
                        checked={notifications.paymentAlerts}
                        onCheckedChange={() => handleNotificationToggle('paymentAlerts')}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-[#0A2540]">System Updates</p>
                        <p className="text-sm text-gray-600">Get notified about system maintenance and updates</p>
                      </div>
                      <Switch 
                        checked={notifications.systemUpdates}
                        onCheckedChange={() => handleNotificationToggle('systemUpdates')}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-[#0A2540]">Announcements</p>
                        <p className="text-sm text-gray-600">Receive school announcements and updates</p>
                      </div>
                      <Switch 
                        checked={notifications.announcements}
                        onCheckedChange={() => handleNotificationToggle('announcements')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
