// Whoop Health Data Manager
class WhoopDataManager {
    constructor() {
        this.userData = {
            name: "Alex Jordan",
            profilePicture: null,
            age: 28,
            weight: 165,
            height: 70 // inches
        };

        this.todayMetrics = {
            recovery: 72,
            strain: 14.5,
            sleep: {
                duration: 7.5,
                quality: 85,
                debt: 0.5
            },
            hrv: 65,
            rhr: 58
        };

        this.activities = [
            { name: "Morning Run", time: "7:30 AM", strain: 12.3, duration: 35 },
            { name: "Strength Training", time: "6:00 PM", strain: 8.7, duration: 45 },
            { name: "Walking", time: "12:00 PM", strain: 2.1, duration: 15 }
        ];

        this.weeklyData = this.generateWeeklyData();
        this.monthlyData = this.generateMonthlyData();
    }

    // Generate random but realistic data for the past week
    generateWeeklyData() {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            data.push({
                date: date.toISOString().split('T')[0],
                recovery: Math.floor(Math.random() * 40) + 50, // 50-90
                strain: Math.random() * 10 + 8, // 8-18
                sleep: {
                    duration: Math.random() * 2 + 6.5, // 6.5-8.5 hours
                    quality: Math.floor(Math.random() * 30) + 65 // 65-95%
                },
                hrv: Math.floor(Math.random() * 40) + 50, // 50-90
                rhr: Math.floor(Math.random() * 10) + 52 // 52-62 bpm
            });
        }
        return data;
    }

    // Generate data for current month
    generateMonthlyData() {
        const today = new Date();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const data = [];

        for (let day = 1; day <= daysInMonth; day++) {
            if (day > today.getDate()) {
                data.push(null); // Future days
            } else {
                data.push({
                    day: day,
                    recovery: Math.floor(Math.random() * 50) + 40, // 40-90
                    strain: Math.random() * 12 + 6, // 6-18
                    sleep: Math.random() * 2 + 6 // 6-8 hours
                });
            }
        }
        return data;
    }

    // Generate sleep stages data (percentage distribution)
    generateSleepStages() {
        const totalMinutes = this.todayMetrics.sleep.duration * 60;

        // Typical sleep stage distribution
        const stages = [
            { type: 'Hero', percentage: 18, color: '#8b5cf6' },
            { type: 'Mentor', percentage: 25, color: '#3b82f6' },
            { type: 'Villain', percentage: 50, color: '#06b6d4' },
            { type: 'researcher', percentage: 7, color: '#ef4444' }
        ];

        return stages.map(stage => ({
            ...stage,
            duration: Math.round(totalMinutes * stage.percentage / 100),
            percentage: stage.percentage
        }));
    }

    // Get recovery score with color
    getRecoveryStatus() {
        const recovery = this.todayMetrics.recovery;
        if (recovery >= 67) return { color: '#00d26a', status: 'Green', label: 'Ready to perform' };
        if (recovery >= 34) return { color: '#ffd60a', status: 'Yellow', label: 'Adequate recovery' };
        return { color: '#ff3b30', status: 'Red', label: 'Need rest' };
    }

    // Get strain level with color
    getStrainStatus() {
        const strain = this.todayMetrics.strain;
        if (strain >= 18) return { color: '#ff3b30', level: 'Very High', description: 'All out effort' };
        if (strain >= 14) return { color: '#ff9500', level: 'High', description: 'Intense activity' };
        if (strain >= 10) return { color: '#ffd60a', level: 'Moderate', description: 'Steady effort' };
        return { color: '#00d26a', level: 'Light', description: 'Easy day' };
    }

    // Update today's metrics (for demo/testing)
    updateTodayMetrics(metrics) {
        this.todayMetrics = { ...this.todayMetrics, ...metrics };
    }

    // Add new activity
    addActivity(activity) {
        this.activities.unshift(activity);
    }

    // Get week summary
    getWeekSummary() {
        const avgRecovery = this.weeklyData.reduce((sum, day) => sum + day.recovery, 0) / this.weeklyData.length;
        const avgStrain = this.weeklyData.reduce((sum, day) => sum + day.strain, 0) / this.weeklyData.length;
        const totalSleep = this.weeklyData.reduce((sum, day) => sum + day.sleep.duration, 0);

        return {
            avgRecovery: Math.round(avgRecovery),
            avgStrain: avgStrain.toFixed(1),
            totalSleep: totalSleep.toFixed(1),
            avgSleepPerNight: (totalSleep / 7).toFixed(1)
        };
    }
}

// Create global instance
const whoopDataManager = new WhoopDataManager();
