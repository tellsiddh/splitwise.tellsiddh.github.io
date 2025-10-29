import React, { useState, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, calculateOptimalSettlements } from '../utils/helpers';
import { storageService } from '../services/storage';
import { Settlement } from '../types';

const SettlementsPage: React.FC = () => {
  const { user } = useAuth();
  const { balances, loading, recordPayment, resetAllData } = useApp();
  const [activeTab, setActiveTab] = useState<'suggested' | 'history'>('suggested');
  const [processingSettlement, setProcessingSettlement] = useState<string | null>(null);
  const [showCustomPayment, setShowCustomPayment] = useState<Settlement | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  // Get all users for display
  const allUsers = storageService.getUsers();
  const getUserById = (id: string) => allUsers.find(u => u.id === id);

  // Get existing settlements
  const settlements = storageService.getSettlements();

  // Calculate optimal settlements
  const optimalSettlements = useMemo(() => {
    if (!user) return [];
    return calculateOptimalSettlements(balances);
  }, [balances, user]);

  // Filter settlements involving current user
  const userSettlements = settlements.filter(settlement => 
    settlement.fromUserId === user?.id || settlement.toUserId === user?.id
  );

  // Group settlements by status
  const pendingSettlements = userSettlements.filter(s => s.status === 'pending');
  const completedSettlements = userSettlements.filter(s => s.status === 'completed');

  // Handle settlement actions
  const handleRecordPayment = async (fromUserId: string, toUserId: string, amount: number, description?: string) => {
    if (!user) return;
    
    setProcessingSettlement(`${fromUserId}-${toUserId}`);
    
    try {
      // Use the new recordPayment function from context
      recordPayment(fromUserId, toUserId, amount, description);
      
      // Show success message
      alert(`Payment of ${formatCurrency(amount)} recorded successfully!`);
      
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment. Please try again.');
    } finally {
      setProcessingSettlement(null);
      setShowCustomPayment(null);
      setCustomAmount('');
    }
  };

  const handleCustomPayment = async () => {
    if (!showCustomPayment || !customAmount || isNaN(parseFloat(customAmount))) return;
    
    const amount = parseFloat(customAmount);
    if (amount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }
    
    await handleRecordPayment(
      showCustomPayment.fromUserId, 
      showCustomPayment.toUserId, 
      amount,
      `Custom settlement payment of ${formatCurrency(amount)}`
    );
  };

  const handleRequestPayment = async (settlement: Settlement) => {
    if (!user) return;
    
    // In a real app, this would send a notification
    alert(`Payment request sent to ${getUserById(settlement.fromUserId)?.name}`);
  };

  // Get net balance for user
  const getNetBalance = () => {
    if (!user) return 0;
    
    return balances
      .filter(balance => balance.userId === user.id)
      .reduce((total, balance) => total + balance.amount, 0);
  };

  const netBalance = getNetBalance();

  if (loading) {
    return (
      <Layout title="Settle Up">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Settle Up">
      <div className="space-y-6">
        {/* Net Balance Overview */}
        <Card>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-sm text-gray-500 mb-2">Your net balance</div>
              <div className={`text-3xl font-bold ${
                netBalance > 0 ? 'text-green-600' : netBalance < 0 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatCurrency(Math.abs(netBalance))}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {netBalance > 0 ? 'you are owed overall' : netBalance < 0 ? 'you owe overall' : 'you are settled up'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <CardContent className="p-3">
            <div className="flex space-x-1">
              {[
                { key: 'suggested', label: 'Suggested Settlements', count: optimalSettlements.length },
                { key: 'history', label: 'Settlement History', count: userSettlements.length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.key
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

        {/* Suggested Settlements */}
        {activeTab === 'suggested' && (
          <div className="space-y-4">
            {optimalSettlements.length > 0 ? (
              <>
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                  <strong>💡 Smart settlements:</strong> These suggestions minimize the number of transactions needed to settle all balances.
                </div>
                
                {optimalSettlements.map((settlement, index) => {
                  const fromUser = getUserById(settlement.fromUserId);
                  const toUser = getUserById(settlement.toUserId);
                  const isUserPaying = settlement.fromUserId === user?.id;
                  const isUserReceiving = settlement.toUserId === user?.id;
                  
                  if (!fromUser || !toUser) return null;
                  
                  return (
                    <Card key={index}>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Avatar user={fromUser} size="sm" />
                              <span className="font-medium">
                                {isUserPaying ? 'You' : fromUser.name}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-2 text-gray-500">
                              <span>owes</span>
                              <div className="w-8 h-px bg-gray-300"></div>
                              <span className="font-semibold text-lg text-gray-900">
                                {formatCurrency(settlement.amount)}
                              </span>
                              <div className="w-8 h-px bg-gray-300"></div>
                              <span>to</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Avatar user={toUser} size="sm" />
                              <span className="font-medium">
                                {isUserReceiving ? 'You' : toUser.name}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-2">
                            {isUserPaying && (
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => handleRecordPayment(settlement.fromUserId, settlement.toUserId, settlement.amount)}
                                  disabled={processingSettlement === `${settlement.fromUserId}-${settlement.toUserId}`}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {processingSettlement === `${settlement.fromUserId}-${settlement.toUserId}` ? 'Recording...' : 'Record Full Payment'}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowCustomPayment(settlement)}
                                  disabled={processingSettlement === `${settlement.fromUserId}-${settlement.toUserId}`}
                                >
                                  Custom Amount
                                </Button>
                              </div>
                            )}
                            
                            {isUserReceiving && (
                              <Button
                                variant="outline"
                                onClick={() => handleRequestPayment(settlement)}
                              >
                                Request Payment
                              </Button>
                            )}
                            
                            {!isUserPaying && !isUserReceiving && (
                              <span className="text-sm text-gray-500 px-3 py-2">
                                Between others
                              </span>
                            )}
                          </div>
                        </div>

                      </CardContent>
                    </Card>
                  );
                })}
              </>
            ) : (
              <Card>
                <CardContent>
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      All settled up!
                    </h3>
                    <p className="text-gray-500 mb-6">
                      You don't have any outstanding balances to settle.
                    </p>
                    <Button>Add New Expense</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Settlement History */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {userSettlements.length > 0 ? (
              <div className="space-y-4">
                {/* Pending Settlements */}
                {pendingSettlements.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Pending Settlements</h3>
                    {pendingSettlements.map((settlement) => {
                      const fromUser = getUserById(settlement.fromUserId);
                      const toUser = getUserById(settlement.toUserId);
                      const isUserPaying = settlement.fromUserId === user?.id;
                      
                      if (!fromUser || !toUser) return null;
                      
                      return (
                        <Card key={settlement.id}>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <div>
                                  <div className="font-medium">
                                    {isUserPaying ? 'You' : fromUser.name} → {isUserPaying ? toUser.name : 'You'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Settlement payment
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="font-semibold text-lg">
                                  {formatCurrency(settlement.amount)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {formatDate(settlement.createdAt)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Completed Settlements */}
                {completedSettlements.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Completed Settlements</h3>
                    {completedSettlements.map((settlement) => {
                      const fromUser = getUserById(settlement.fromUserId);
                      const toUser = getUserById(settlement.toUserId);
                      const isUserPaying = settlement.fromUserId === user?.id;
                      
                      if (!fromUser || !toUser) return null;
                      
                      return (
                        <Card key={settlement.id} className="opacity-75">
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <div>
                                  <div className="font-medium">
                                    {isUserPaying ? 'You' : fromUser.name} → {isUserPaying ? toUser.name : 'You'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Settlement payment
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="font-semibold text-lg text-green-600">
                                  {formatCurrency(settlement.amount)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {settlement.settledAt ? formatDate(settlement.settledAt) : formatDate(settlement.createdAt)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent>
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No settlement history
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Your settlement transactions will appear here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Individual Balances Breakdown */}
        {balances.filter(b => b.userId === user?.id).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {balances
                  .filter(balance => balance.userId === user?.id && Math.abs(balance.amount) > 0.01)
                  .map((balance, index) => (
                    <div key={`balance-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">💰</span>
                        </div>
                        <span className="font-medium">Balance</span>
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-semibold ${
                          balance.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {balance.amount > 0 ? 'you are owed' : 'you owe'} {formatCurrency(Math.abs(balance.amount))}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Debug Section - Remove in production */}
        <Card className="mt-8 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Debug Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              If you're experiencing data corruption errors, you can reset all data:
            </p>
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm('This will delete all data and reset the app. Are you sure?')) {
                  resetAllData();
                }
              }}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Reset All Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Custom Payment Modal */}
      {showCustomPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Record Custom Payment</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Full amount owed: <span className="font-semibold">{formatCurrency(showCustomPayment.amount)}</span>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  From: <span className="font-medium">{getUserById(showCustomPayment.fromUserId)?.name}</span> to{' '}
                  <span className="font-medium">{getUserById(showCustomPayment.toUserId)?.name}</span>
                </p>
              </div>
              
              <Input
                label="Payment Amount"
                type="number"
                step="0.01"
                min="0.01"
                max={showCustomPayment.amount}
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
              />
              
              <div className="flex space-x-3">
                <Button
                  onClick={handleCustomPayment}
                  disabled={!customAmount || parseFloat(customAmount) <= 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Record Payment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCustomPayment(null);
                    setCustomAmount('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SettlementsPage;