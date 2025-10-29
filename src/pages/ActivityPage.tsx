import React, { useState, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers';
import { storageService } from '../services/storage';
import { Activity, ActivityType } from '../types';

const ActivityPage: React.FC = () => {
  const { user } = useAuth();
  const { expenses, groups, friends, loading } = useApp();
  const [filter, setFilter] = useState<'all' | 'expenses' | 'groups' | 'friends'>('all');

  // Get all users for display
  const allUsers = storageService.getUsers();
  const getUserById = (id: string) => allUsers.find(u => u.id === id);

  // Generate activities from current data
  const activities = useMemo(() => {
    const activityList: Activity[] = [];

    // Add expense activities
    expenses.forEach(expense => {
      const paidByUser = getUserById(expense.paidBy);
      if (!paidByUser) return;

      activityList.push({
        id: `expense-${expense.id}`,
        type: 'expense_created',
        userId: expense.paidBy,
        targetId: expense.id,
        description: `${paidByUser.id === user?.id ? 'You' : paidByUser.name} added "${expense.description}" for ${formatCurrency(expense.amount)}`,
        data: {
          expense: expense,
          category: expense.category,
          amount: expense.amount,
          splitCount: expense.splits.length
        },
        createdAt: expense.createdAt
      });
    });

    // Add group activities
    groups.forEach(group => {
      const createdByUser = getUserById(group.createdBy);
      if (!createdByUser) return;

      activityList.push({
        id: `group-${group.id}`,
        type: 'group_created',
        userId: group.createdBy,
        targetId: group.id,
        description: `${createdByUser.id === user?.id ? 'You' : createdByUser.name} created group "${group.name}"`,
        data: {
          group: group,
          memberCount: group.members.length
        },
        createdAt: group.createdAt
      });
    });

    // Add friend activities
    const friendRelations = storageService.getFriends();
    friendRelations
      .filter(f => f.userId === user?.id && f.status === 'accepted')
      .forEach(friendship => {
        const friend = getUserById(friendship.friendId);
        if (!friend) return;

        activityList.push({
          id: `friend-${friendship.id}`,
          type: 'friend_added',
          userId: user?.id || '',
          targetId: friendship.friendId,
          description: `You added ${friend.name} as a friend`,
          data: {
            friend: friend
          },
          createdAt: friendship.createdAt
        });
      });

    // Sort by date (newest first)
    return activityList.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [expenses, groups, user, getUserById]);

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    switch (filter) {
      case 'expenses':
        return activity.type.includes('expense');
      case 'groups':
        return activity.type.includes('group');
      case 'friends':
        return activity.type.includes('friend');
      default:
        return true;
    }
  });

  const getActivityIcon = (type: ActivityType): string => {
    switch (type) {
      case 'expense_created':
      case 'expense_updated':
        return '💰';
      case 'expense_deleted':
        return '🗑️';
      case 'payment_made':
        return '💸';
      case 'group_created':
        return '👥';
      case 'friend_added':
        return '👨‍👩‍👧‍👦';
      case 'settlement_completed':
        return '✅';
      default:
        return '📝';
    }
  };

  const getActivityColor = (type: ActivityType): string => {
    switch (type) {
      case 'expense_created':
      case 'expense_updated':
        return 'bg-blue-100 text-blue-800';
      case 'expense_deleted':
        return 'bg-red-100 text-red-800';
      case 'payment_made':
        return 'bg-green-100 text-green-800';
      case 'group_created':
        return 'bg-purple-100 text-purple-800';
      case 'friend_added':
        return 'bg-yellow-100 text-yellow-800';
      case 'settlement_completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const groupActivitiesByDate = (activities: Activity[]) => {
    const groups: { [key: string]: Activity[] } = {};
    
    activities.forEach(activity => {
      const date = formatDate(activity.createdAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });

    return groups;
  };

  const groupedActivities = groupActivitiesByDate(filteredActivities);

  if (loading) {
    return (
      <Layout title="Activity">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Activity">
      <div className="space-y-6">
        {/* Filter Tabs */}
        <Card>
          <CardContent className="p-3">
            <div className="flex space-x-1">
              {[
                { key: 'all', label: 'All Activity', count: activities.length },
                { key: 'expenses', label: 'Expenses', count: activities.filter(a => a.type.includes('expense')).length },
                { key: 'groups', label: 'Groups', count: activities.filter(a => a.type.includes('group')).length },
                { key: 'friends', label: 'Friends', count: activities.filter(a => a.type.includes('friend')).length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    filter === tab.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        {Object.keys(groupedActivities).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedActivities).map(([date, dayActivities]) => (
              <div key={date}>
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <span className="text-sm font-medium text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
                      {date}
                    </span>
                  </div>
                  <div className="flex-1 ml-4 border-t border-gray-200"></div>
                </div>

                <div className="space-y-3">
                  {dayActivities.map((activity) => {
                    return (
                      <Card key={activity.id}>
                        <CardContent>
                          <div className="flex items-start space-x-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${getActivityColor(activity.type)}`}>
                              {getActivityIcon(activity.type)}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">
                                  {activity.description}
                                </p>
                                <span className="text-xs text-gray-500">
                                  {formatDateTime(activity.createdAt)}
                                </span>
                              </div>

                              {/* Additional Activity Details */}
                              <div className="mt-2">
                                {activity.type === 'expense_created' && activity.data?.expense && (
                                  <div className="bg-gray-50 rounded-md p-3">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-600">Category:</span>
                                      <span className="font-medium capitalize">{activity.data.expense.category}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-600">Split between:</span>
                                      <span className="font-medium">{activity.data.splitCount} people</span>
                                    </div>
                                    {activity.data.expense.groupId && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Group:</span>
                                        <span className="font-medium">
                                          {groups.find(g => g.id === activity.data.expense.groupId)?.name || 'Unknown'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {activity.type === 'group_created' && activity.data?.group && (
                                  <div className="bg-gray-50 rounded-md p-3">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-600">Members:</span>
                                      <span className="font-medium">{activity.data.memberCount} people</span>
                                    </div>
                                    {activity.data.group.description && (
                                      <div className="text-sm text-gray-600 mt-1">
                                        "{activity.data.group.description}"
                                      </div>
                                    )}
                                  </div>
                                )}

                                {activity.type === 'friend_added' && activity.data?.friend && (
                                  <div className="bg-gray-50 rounded-md p-3">
                                    <div className="flex items-center space-x-2">
                                      <Avatar user={activity.data.friend} size="sm" />
                                      <div>
                                        <div className="text-sm font-medium">{activity.data.friend.name}</div>
                                        <div className="text-xs text-gray-500">{activity.data.friend.email}</div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No activity yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Your activity timeline will appear here as you use the app.
                </p>
                <div className="flex justify-center space-x-3">
                  <Button>Add Expense</Button>
                  <Button variant="outline">Create Group</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Stats */}
        {activities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Activity Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{activities.length}</div>
                  <div className="text-sm text-gray-500">Total Activities</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {activities.filter(a => a.type.includes('expense')).length}
                  </div>
                  <div className="text-sm text-gray-500">Expense Actions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {activities.filter(a => a.type.includes('group')).length}
                  </div>
                  <div className="text-sm text-gray-500">Group Actions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {activities.filter(a => a.type.includes('friend')).length}
                  </div>
                  <div className="text-sm text-gray-500">Friend Actions</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default ActivityPage;