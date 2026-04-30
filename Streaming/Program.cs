using Microsoft.AspNetCore.HttpOverrides;
using Streaming.Services;
using Streaming.Models;
using Streaming.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();
builder.Services.AddControllers(); // Enable API controllers

// Add SignalR
builder.Services.AddSignalR();

// Add session support
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// Configure streaming settings
builder.Services.Configure<StreamingConfiguration>(
    builder.Configuration.GetSection("Streaming"));

// Configure forwarded headers (for proxy / TLS termination)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Allow forwarded headers from any proxy (use carefully).
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Register services
builder.Services.AddSingleton<StreamSettingsStore>();
builder.Services.AddScoped<StreamService>();   // StreamService (depends on StreamerService)
builder.Services.AddSingleton<TelegramService>(); // TelegramService

var app = builder.Build();

// Apply forwarded headers before anything that might check Scheme/IsHttps
app.UseForwardedHeaders();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // Re-enable HSTS for HTTPS setup
    app.UseHsts();
}

// Enable HTTPS redirection for production with SSL
app.UseHttpsRedirection();

// TEMPORARILY DISABLE HTTPS REDIRECTION FOR DOCKER DEPLOYMENT
// This middleware will be re-enabled when SSL certificates are configured

/*
// HTTPS Redirection - disable for API endpoints
app.Use(async (context, next) =>
{
    // Allow HTTP for API endpoints (for RTMP server)
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        await next();
    }
    else
    {
        // Force HTTPS for other requests in production
        if (!context.Request.IsHttps && app.Environment.IsDevelopment())
        {
            // Allow HTTP in Development
            await next();
        }
        else if (!context.Request.IsHttps && !app.Environment.IsDevelopment())
        {
            // Redirect to HTTPS in Production
            var httpsUrl = $"https://{context.Request.Host}{context.Request.Path}{context.Request.QueryString}";
            context.Response.Redirect(httpsUrl, permanent: true);
        }
        else
        {
            await next();
        }
    }
});
*/

app.UseStaticFiles();

app.UseSession(); // Enable session middleware

app.UseRouting();

app.UseAuthorization();

app.MapRazorPages();
app.MapControllers(); // Enable API controllers

// Map SignalR hub
app.MapHub<StreamHub>("/streamHub");

app.Run();
