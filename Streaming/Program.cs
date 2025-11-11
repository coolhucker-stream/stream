using Streaming.Services;
using Streaming.Models;
using Streaming.Data;
using Microsoft.EntityFrameworkCore;
using Streaming;

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

// Add SQLite database (only for VideoStreams)
builder.Services.AddDbContext<StreamingDbContext>(options =>
{
    var dbPath = builder.Environment.IsDevelopment() 
        ? "Data Source=streaming.db"  // Local development - current directory
        : "Data Source=/app/data/streaming.db";  // Docker environment
    options.UseSqlite(dbPath);
});

// Configure streaming settings
builder.Services.Configure<StreamingConfiguration>(
    builder.Configuration.GetSection("Streaming"));

// Register services
builder.Services.AddScoped<StreamService>();   // StreamService (depends on StreamerService)
builder.Services.AddSingleton<TelegramService>(); // TelegramService

var app = builder.Build();

// Ensure database is created and migrations are applied
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<StreamingDbContext>();
        context.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database.");
    }
}

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

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

app.UseStaticFiles();

app.UseSession(); // Enable session middleware

app.UseRouting();

app.UseAuthorization();

app.MapRazorPages();
app.MapControllers(); // Enable API controllers

// Map SignalR hub
app.MapHub<StreamHub>("/streamHub");

app.Run();
