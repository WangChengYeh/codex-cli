use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Platform {
    Desktop,
    Android,
    iOS,
}

impl Platform {
    pub fn current() -> Self {
        #[cfg(target_os = "android")]
        return Platform::Android;
        
        #[cfg(target_os = "ios")]
        return Platform::iOS;
        
        #[cfg(not(any(target_os = "android", target_os = "ios")))]
        return Platform::Desktop;
    }
    
    pub fn is_mobile(&self) -> bool {
        matches!(self, Platform::Android | Platform::iOS)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformConfig {
    pub platform: Platform,
    pub command_allowlist: Vec<String>,
    pub max_execution_time: u64, // seconds
    pub workspace_restricted: bool,
}

impl PlatformConfig {
    pub fn default_for_platform(platform: Platform) -> Self {
        match platform {
            Platform::Desktop => Self {
                platform,
                command_allowlist: vec![
                    "ls".to_string(),
                    "pwd".to_string(),
                    "echo".to_string(),
                    "cat".to_string(),
                    "grep".to_string(),
                    "find".to_string(),
                    "mkdir".to_string(),
                    "rm".to_string(),
                    "cp".to_string(),
                    "mv".to_string(),
                    "git".to_string(),
                    "npm".to_string(),
                    "node".to_string(),
                    "python".to_string(),
                    "cargo".to_string(),
                    "rustc".to_string(),
                ],
                max_execution_time: 300, // 5 minutes
                workspace_restricted: true,
            },
            Platform::Android => Self {
                platform,
                command_allowlist: vec![
                    "ls".to_string(),
                    "pwd".to_string(),
                    "echo".to_string(),
                    "cat".to_string(),
                    "grep".to_string(),
                    "find".to_string(),
                    "mkdir".to_string(),
                    // Android has restricted command execution
                ],
                max_execution_time: 60, // 1 minute for mobile
                workspace_restricted: true,
            },
            Platform::iOS => Self {
                platform,
                command_allowlist: vec![
                    "ls".to_string(),
                    "pwd".to_string(),
                    "echo".to_string(),
                    "cat".to_string(),
                    // iOS will use ios_system commands only
                ],
                max_execution_time: 60, // 1 minute for mobile
                workspace_restricted: true,
            },
        }
    }
    
    pub fn is_command_allowed(&self, command: &str) -> bool {
        self.command_allowlist.iter().any(|allowed| allowed == command)
    }
}

pub fn get_platform_info() -> PlatformConfig {
    let platform = Platform::current();
    PlatformConfig::default_for_platform(platform)
}