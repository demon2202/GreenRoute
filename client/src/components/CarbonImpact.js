import React from "react";
import { 
  Leaf, 
  Target, 
  TrendingUp,
  TreePine
} from "lucide-react";
import { motion } from "framer-motion";

// Mock components for UI elements that might not be in the project
const Card = ({ children, className }) => <div className={`bg-white rounded-lg p-4 ${className}`}>{children}</div>;
const CardHeader = ({ children, className }) => <div className={`border-b pb-2 mb-2 ${className}`}>{children}</div>;
const CardTitle = ({ children, className }) => <h2 className={`text-lg font-bold ${className}`}>{children}</h2>;
const CardContent = ({ children, className }) => <div className={className}>{children}</div>;
const Progress = ({ value, className }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${value}%` }}></div>
  </div>
);

export default function CarbonImpact({ todaySavings = 2.3, monthlySavings = 47.8, monthlyGoal = 50 }) {
  const goalProgress = (monthlySavings / monthlyGoal) * 100;

  return (
    <Card className="glass-effect shadow-lg border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-500" />
          Your Carbon Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            className="text-center p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-2xl font-bold text-emerald-700 mb-1">
              {todaySavings} kg
            </div>
            <div className="text-sm text-neutral-600 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Today
            </div>
          </motion.div>
          
          <motion.div 
            className="text-center p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-2xl font-bold text-emerald-700 mb-1">
              {monthlySavings} kg
            </div>
            <div className="text-sm text-neutral-600 flex items-center justify-center gap-1">
              <Target className="w-3 h-3" />
              This Month
            </div>
          </motion.div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">Monthly Goal Progress</span>
            <span className="text-sm font-bold text-emerald-600">{Math.round(goalProgress)}%</span>
          </div>
          <Progress value={goalProgress} className="h-3 bg-emerald-100" />
          <div className="text-xs text-neutral-500 text-center">
            {(monthlyGoal - monthlySavings).toFixed(1)} kg to reach your goal
          </div>
        </div>

        <div className="pt-3 border-t border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-700">
            <TreePine className="w-4 h-4" />
            <span className="text-sm font-medium">
              Equivalent to planting {Math.round(monthlySavings / 22)} trees this month
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
